import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
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
import {
	buildConversionGraph,
	tryConvert,
} from "#src/lib/recipe-utils/conversion-graph";

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
	// Extra quantity to buy on top of `neededQuantity` so stock stays at
	// or above the product's min after the planned meals are cooked. Zero
	// when the product has no min, or when the check was skipped because
	// of a unit-conversion gap.
	minStockBuffer: number;
	stockQuantity: number;
	status: "sufficient" | "deficit" | "unknown_unit";
}

interface RestockItem {
	productId: string;
	productName: string;
	quantityUnitId: string | null;
	unitName: string | null;
	unitAbbreviation: string | null;
	minStock: number;
	stockQuantity: number;
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
							gte(mealPlanEntry.date, startDate),
							lte(mealPlanEntry.date, endDate),
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
				const linkedProductIds = [
					...new Set([...linked.values()].map((v) => v.productId)),
				];

				// Tracked products (minStockAmount > 0) for the restock list
				const trackedProducts = await db
					.select()
					.from(product)
					.where(
						and(
							eq(product.userId, session.user.id),
							gt(product.minStockAmount, "0"),
						),
					);

				// Products we need to materialize: linked ingredients ∪ tracked-for-restock
				const productIds = [
					...new Set([
						...linkedProductIds,
						...trackedProducts.map((p) => p.id),
					]),
				];

				const units = await db
					.select()
					.from(quantityUnit)
					.where(eq(quantityUnit.userId, session.user.id));
				const unitMap = new Map(units.map((u) => [u.id, u]));

				if (productIds.length === 0) {
					return json({
						ingredients: [],
						unlinkedIngredients: unlinked,
						restock: [],
					});
				}

				const products = await db
					.select()
					.from(product)
					.where(
						and(
							eq(product.userId, session.user.id),
							inArray(product.id, productIds),
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
							inArray(stockEntry.productId, productIds),
						),
					)
					.groupBy(stockEntry.productId);

				const conversions = await db
					.select()
					.from(unitConversion)
					.where(eq(unitConversion.userId, session.user.id));

				const productMap = new Map(products.map((p) => [p.id, p]));
				const stockMap = new Map(
					stock.map((s) => [s.productId, Number(s.totalQuantity)]),
				);

				const graph = buildConversionGraph(conversions);

				const ingredients: AggregatedIngredient[] = [];

				for (const agg of linked.values()) {
					const p = productMap.get(agg.productId);
					if (!p) continue;

					const unit = agg.unitId ? unitMap.get(agg.unitId) : null;
					const stockQty = stockMap.get(agg.productId) ?? 0;

					// Try to convert needed quantity to product's default unit for comparison
					let neededInStockUnit = tryConvert(
						graph,
						agg.quantity,
						agg.unitId,
						p.defaultQuantityUnitId,
					);

					let status: AggregatedIngredient["status"];
					let minStockBuffer = 0;
					if (
						agg.unitId !== p.defaultQuantityUnitId &&
						neededInStockUnit === null
					) {
						// Can't compare across units — leave min-stock out rather than
						// mixing values in incompatible units.
						status = "unknown_unit";
						neededInStockUnit = agg.quantity;
					} else {
						const needed = neededInStockUnit ?? agg.quantity;
						const minStock = Number(p.minStockAmount);
						const target = needed + minStock;
						status = stockQty >= target ? "sufficient" : "deficit";
						// Report the buffer in the ingredient's unit so it composes
						// with neededQuantity in the UI. Comparison above is in the
						// default unit; reporting happens in whatever unit the
						// recipe uses.
						if (minStock > 0) {
							if (agg.unitId === p.defaultQuantityUnitId) {
								minStockBuffer = minStock;
							} else {
								minStockBuffer =
									tryConvert(
										graph,
										minStock,
										p.defaultQuantityUnitId,
										agg.unitId,
									) ?? minStock;
							}
						}
					}

					ingredients.push({
						productId: agg.productId,
						productName: p.name,
						quantityUnitId: agg.unitId,
						unitName: unit?.name ?? null,
						unitAbbreviation: unit?.abbreviation ?? null,
						neededQuantity: agg.quantity,
						minStockBuffer,
						stockQuantity: stockQty,
						status,
					});
				}

				// Restock: products with a min threshold, below min, not already listed
				const linkedIdSet = new Set(linkedProductIds);
				const restock: RestockItem[] = [];
				for (const p of trackedProducts) {
					if (linkedIdSet.has(p.id)) continue;
					const stockQty = stockMap.get(p.id) ?? 0;
					const minStock = Number(p.minStockAmount);
					if (stockQty >= minStock) continue;
					const unit = p.defaultQuantityUnitId
						? unitMap.get(p.defaultQuantityUnitId)
						: null;
					restock.push({
						productId: p.id,
						productName: p.name,
						quantityUnitId: p.defaultQuantityUnitId,
						unitName: unit?.name ?? null,
						unitAbbreviation: unit?.abbreviation ?? null,
						minStock,
						stockQuantity: stockQty,
					});
				}

				return json({
					ingredients,
					unlinkedIngredients: unlinked,
					restock,
				});
			},
		},
	},
});
