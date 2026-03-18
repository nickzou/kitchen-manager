import { createFileRoute } from "@tanstack/react-router";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "#src/db";
import {
	product,
	productUnitConversion,
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

export type RecipeAvailability = Record<
	string,
	"sufficient" | "deficit" | "no-ingredients"
>;

export const Route = createFileRoute("/api/recipes/availability")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const userId = session.user.id;

				// Get all recipe ingredients for user's recipes
				const ingredients = await db
					.select({
						recipeId: recipeIngredient.recipeId,
						productId: recipeIngredient.productId,
						quantity: recipeIngredient.quantity,
						quantityUnitId: recipeIngredient.quantityUnitId,
						groupName: recipeIngredient.groupName,
					})
					.from(recipeIngredient)
					.where(eq(recipeIngredient.userId, userId));

				// Group ingredients by recipe
				const recipeIngredientsMap = new Map<string, typeof ingredients>();
				for (const ing of ingredients) {
					if (!recipeIngredientsMap.has(ing.recipeId)) {
						recipeIngredientsMap.set(ing.recipeId, []);
					}
					recipeIngredientsMap.get(ing.recipeId)?.push(ing);
				}

				// Collect all product IDs
				const productIds = [
					...new Set(
						ingredients
							.filter((i) => i.productId)
							.map((i) => i.productId as string),
					),
				];

				if (productIds.length === 0) {
					// All recipes have no trackable ingredients
					const result: RecipeAvailability = {};
					for (const recipeId of recipeIngredientsMap.keys()) {
						result[recipeId] = "no-ingredients";
					}
					return json(result);
				}

				// Get products for default unit info
				const products = await db
					.select({
						id: product.id,
						defaultQuantityUnitId: product.defaultQuantityUnitId,
					})
					.from(product)
					.where(
						and(eq(product.userId, userId), inArray(product.id, productIds)),
					);

				// Get stock totals per product
				const stock = await db
					.select({
						productId: stockEntry.productId,
						totalQuantity: sql<string>`SUM(CAST(${stockEntry.quantity} AS numeric))`,
					})
					.from(stockEntry)
					.where(
						and(
							eq(stockEntry.userId, userId),
							inArray(stockEntry.productId, productIds),
						),
					)
					.groupBy(stockEntry.productId);

				// Get both global and product-specific conversions
				const [globalConversions, productConversions] = await Promise.all([
					db
						.select()
						.from(unitConversion)
						.where(eq(unitConversion.userId, userId)),
					db
						.select()
						.from(productUnitConversion)
						.where(
							and(
								eq(productUnitConversion.userId, userId),
								inArray(productUnitConversion.productId, productIds),
							),
						),
				]);

				const productMap = new Map(products.map((p) => [p.id, p]));
				const stockMap = new Map(
					stock.map((s) => [s.productId, Number(s.totalQuantity)]),
				);

				// Build per-product conversion graph (product-specific overrides global)
				function buildProductGraph(forProductId: string) {
					const specific = productConversions.filter(
						(c) => c.productId === forProductId,
					);
					return buildConversionGraph([...globalConversions, ...specific]);
				}

				function checkIngredient(ing: (typeof ingredients)[number]): {
					sufficient: boolean;
					trackable: boolean;
				} {
					if (!ing.productId) return { sufficient: true, trackable: false };

					const p = productMap.get(ing.productId);
					if (!p) return { sufficient: true, trackable: false };

					const stockQty = stockMap.get(ing.productId) ?? 0;
					const graph = buildProductGraph(ing.productId);
					const needed = Number(ing.quantity);
					const neededInStockUnit = tryConvert(
						graph,
						needed,
						ing.quantityUnitId,
						p.defaultQuantityUnitId,
					);

					if (
						ing.quantityUnitId !== p.defaultQuantityUnitId &&
						neededInStockUnit === null
					) {
						// Can't convert, treat as unknown — not sufficient
						return { sufficient: false, trackable: true };
					}

					const effectiveNeeded = neededInStockUnit ?? needed;
					return {
						sufficient: stockQty >= effectiveNeeded,
						trackable: true,
					};
				}

				// Evaluate each recipe
				const result: RecipeAvailability = {};

				for (const [recipeId, ings] of recipeIngredientsMap) {
					const hasTrackable = ings.some((i) => i.productId);
					if (!hasTrackable) {
						result[recipeId] = "no-ingredients";
						continue;
					}

					// Split into ungrouped and grouped
					const ungrouped = ings.filter((i) => !i.groupName);
					const groups = new Map<string, typeof ings>();
					for (const ing of ings) {
						if (ing.groupName) {
							if (!groups.has(ing.groupName)) {
								groups.set(ing.groupName, []);
							}
							groups.get(ing.groupName)?.push(ing);
						}
					}

					let allSufficient = true;

					// Check ungrouped: all must be sufficient
					for (const ing of ungrouped) {
						const { sufficient, trackable } = checkIngredient(ing);
						if (trackable && !sufficient) {
							allSufficient = false;
							break;
						}
					}

					// Check groups: at least one in each group must be sufficient
					if (allSufficient) {
						for (const groupIngs of groups.values()) {
							const anyTrackable = groupIngs.some((i) => i.productId);
							if (!anyTrackable) continue;

							const anySufficient = groupIngs.some(
								(i) => checkIngredient(i).sufficient,
							);
							if (!anySufficient) {
								allSufficient = false;
								break;
							}
						}
					}

					result[recipeId] = allSufficient ? "sufficient" : "deficit";
				}

				return json(result);
			},
		},
	},
});
