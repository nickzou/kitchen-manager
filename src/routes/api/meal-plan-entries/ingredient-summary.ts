import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "#src/db";
import {
	mealPlanEntry,
	product,
	quantityUnit,
	recipe,
	recipeIngredient,
	stockEntry,
	unitConversion,
} from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

interface AggregatedIngredient {
	productId: string;
	productName: string;
	quantityUnitId: string | null;
	unitName: string | null;
	unitAbbreviation: string | null;
	neededQuantity: number;
	stockQuantity: number;
	status: "sufficient" | "deficit" | "unknown_unit";
}

export const Route = createFileRoute(
	"/api/meal-plan-entries/ingredient-summary",
)({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const url = new URL(request.url);
				const startDate = url.searchParams.get("startDate");
				const endDate = url.searchParams.get("endDate");

				if (!startDate || !endDate) {
					return json(
						{ error: "startDate and endDate are required" },
						{ status: 400 },
					);
				}

				// Get all entries in range with their recipe ingredients
				const entries = await db
					.select({
						entryServings: mealPlanEntry.servings,
						recipeServings: recipe.servings,
						ingredientProductId: recipeIngredient.productId,
						ingredientQuantity: recipeIngredient.quantity,
						ingredientUnitId: recipeIngredient.quantityUnitId,
						ingredientNotes: recipeIngredient.notes,
					})
					.from(mealPlanEntry)
					.innerJoin(recipe, eq(mealPlanEntry.recipeId, recipe.id))
					.innerJoin(recipeIngredient, eq(recipe.id, recipeIngredient.recipeId))
					.where(
						and(
							eq(mealPlanEntry.userId, session.user.id),
							gte(mealPlanEntry.date, new Date(startDate)),
							lte(mealPlanEntry.date, new Date(endDate)),
						),
					);

				// Aggregate by (productId, quantityUnitId)
				const linked = new Map<
					string,
					{ productId: string; unitId: string | null; quantity: number }
				>();
				const unlinked: {
					notes: string | null;
					quantity: string;
					unitId: string | null;
					scaleFactor: number;
				}[] = [];

				for (const entry of entries) {
					const scaleFactor =
						(entry.entryServings ?? entry.recipeServings ?? 1) /
						(entry.recipeServings ?? 1);
					const qty = Number(entry.ingredientQuantity) * scaleFactor;

					if (!entry.ingredientProductId) {
						unlinked.push({
							notes: entry.ingredientNotes,
							quantity: entry.ingredientQuantity,
							unitId: entry.ingredientUnitId,
							scaleFactor,
						});
						continue;
					}

					const key = `${entry.ingredientProductId}::${entry.ingredientUnitId ?? "null"}`;
					const existing = linked.get(key);
					if (existing) {
						existing.quantity += qty;
					} else {
						linked.set(key, {
							productId: entry.ingredientProductId,
							unitId: entry.ingredientUnitId,
							quantity: qty,
						});
					}
				}

				// Get product info and stock for linked ingredients
				const productIds = [
					...new Set([...linked.values()].map((v) => v.productId)),
				];

				if (productIds.length === 0) {
					return json({ ingredients: [], unlinkedIngredients: unlinked });
				}

				const products = await db
					.select()
					.from(product)
					.where(
						and(
							eq(product.userId, session.user.id),
							sql`${product.id} = ANY(${productIds})`,
						),
					);

				const stock = await db
					.select({
						productId: stockEntry.productId,
						totalQuantity: sql<string>`SUM(CAST(${stockEntry.quantity} AS numeric))`,
					})
					.from(stockEntry)
					.where(
						and(
							eq(stockEntry.userId, session.user.id),
							sql`${stockEntry.productId} = ANY(${productIds})`,
						),
					)
					.groupBy(stockEntry.productId);

				const conversions = await db
					.select()
					.from(unitConversion)
					.where(eq(unitConversion.userId, session.user.id));

				const units = await db
					.select()
					.from(quantityUnit)
					.where(eq(quantityUnit.userId, session.user.id));

				const productMap = new Map(products.map((p) => [p.id, p]));
				const stockMap = new Map(
					stock.map((s) => [s.productId, Number(s.totalQuantity)]),
				);
				const unitMap = new Map(units.map((u) => [u.id, u]));

				// Build conversion graph for unit conversion attempts
				const conversionGraph = new Map<string, Map<string, number>>();
				for (const c of conversions) {
					if (!conversionGraph.has(c.fromUnitId))
						conversionGraph.set(c.fromUnitId, new Map());
					conversionGraph.get(c.fromUnitId)?.set(c.toUnitId, Number(c.factor));

					if (!conversionGraph.has(c.toUnitId))
						conversionGraph.set(c.toUnitId, new Map());
					conversionGraph
						.get(c.toUnitId)
						?.set(c.fromUnitId, 1 / Number(c.factor));
				}

				function tryConvert(
					qty: number,
					fromUnitId: string | null,
					toUnitId: string | null,
				): number | null {
					if (fromUnitId === toUnitId) return qty;
					if (!fromUnitId || !toUnitId) return null;
					const fromEdges = conversionGraph.get(fromUnitId);
					if (!fromEdges) return null;
					const factor = fromEdges.get(toUnitId);
					if (factor !== undefined) return qty * factor;
					return null;
				}

				const ingredients: AggregatedIngredient[] = [];

				for (const agg of linked.values()) {
					const p = productMap.get(agg.productId);
					if (!p) continue;

					const unit = agg.unitId ? unitMap.get(agg.unitId) : null;
					const stockQty = stockMap.get(agg.productId) ?? 0;

					// Try to convert needed quantity to product's default unit for comparison
					let neededInStockUnit = tryConvert(
						agg.quantity,
						agg.unitId,
						p.quantityUnitId,
					);

					let status: AggregatedIngredient["status"];
					if (agg.unitId !== p.quantityUnitId && neededInStockUnit === null) {
						status = "unknown_unit";
						neededInStockUnit = agg.quantity;
					} else {
						const needed = neededInStockUnit ?? agg.quantity;
						status = stockQty >= needed ? "sufficient" : "deficit";
					}

					ingredients.push({
						productId: agg.productId,
						productName: p.name,
						quantityUnitId: agg.unitId,
						unitName: unit?.name ?? null,
						unitAbbreviation: unit?.abbreviation ?? null,
						neededQuantity: agg.quantity,
						stockQuantity: stockQty,
						status,
					});
				}

				return json({ ingredients, unlinkedIngredients: unlinked });
			},
		},
	},
});
