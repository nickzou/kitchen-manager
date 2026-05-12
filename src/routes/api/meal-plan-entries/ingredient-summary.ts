import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "#src/db";
import {
	mealPlanEntry,
	product,
	productCategory,
	productCategoryType,
	productUnitConversion,
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

interface IngredientRecipeRef {
	recipeId: string;
	recipeName: string;
	mealPlanEntryId: string;
	mealPlanEntryDate: string;
	quantity: number;
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
	recipes: IngredientRecipeRef[];
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

interface ProducibleIngredient {
	productId: string;
	productName: string;
	quantityUnitId: string | null;
	unitName: string | null;
	unitAbbreviation: string | null;
	neededQuantity: number;
	stockQuantity: number;
	sourceRecipeId: string;
	sourceRecipeName: string;
	recipes: IngredientRecipeRef[];
}

interface CategoryRestockItem {
	categoryId: string;
	categoryName: string;
	minStock: number;
	stockQuantity: number;
	quantityUnitId: string | null;
	unitName: string | null;
	unitAbbreviation: string | null;
	// Products that contribute to the rollup (those whose stock was
	// successfully converted into the category's unit).
	productIds: string[];
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
						mealPlanEntryId: mealPlanEntry.id,
						mealPlanEntryDate: mealPlanEntry.date,
						entryServings: mealPlanEntry.servings,
						recipeId: recipe.id,
						recipeName: recipe.name,
						recipeServings: recipe.servings,
						ingredientId: recipeIngredient.id,
						ingredientProductId: recipeIngredient.productId,
						ingredientQuantity: recipeIngredient.quantity,
						ingredientUnitId: recipeIngredient.quantityUnitId,
						ingredientNotes: recipeIngredient.notes,
						ingredientGroupName: recipeIngredient.groupName,
						ingredientSortOrder: recipeIngredient.sortOrder,
						ingredientSkipStockDeduction: recipeIngredient.skipStockDeduction,
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

				// Product IDs we'll need maps for: anything an entry references plus
				// the tracked-for-restock set. Built before aggregation because the
				// group-fulfillment rule needs stock data to decide what to drop.
				const entryProductIds = entries
					.map((e) => e.ingredientProductId)
					.filter((id): id is string => id != null);
				const productIds = [
					...new Set([...entryProductIds, ...trackedProducts.map((p) => p.id)]),
				];

				const units = await db
					.select()
					.from(quantityUnit)
					.where(eq(quantityUnit.userId, session.user.id));
				const unitMap = new Map(units.map((u) => [u.id, u]));

				if (productIds.length === 0) {
					// Category restock runs independently of meal-plan ingredients —
					// even with no planned meals or tracked products, a category min
					// can still be unmet.
					const categoryRestock = await computeCategoryRestock(
						session.user.id,
						unitMap,
					);
					return json({
						ingredients: [],
						unlinkedIngredients: [],
						restock: [],
						producible: [],
						categoryRestock,
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

				const [globalConversions, productConversions, sourceRecipes] =
					await Promise.all([
						db
							.select()
							.from(unitConversion)
							.where(eq(unitConversion.userId, session.user.id)),
						db
							.select()
							.from(productUnitConversion)
							.where(
								and(
									eq(productUnitConversion.userId, session.user.id),
									inArray(productUnitConversion.productId, productIds),
								),
							),
						db
							.select({
								id: recipe.id,
								name: recipe.name,
								producedProductId: recipe.producedProductId,
							})
							.from(recipe)
							.where(
								and(
									eq(recipe.userId, session.user.id),
									inArray(recipe.producedProductId, productIds),
								),
							),
					]);

				// Map producible product → first source recipe (deterministic).
				// A product produced by more than one recipe just picks the first
				// row; user-pinned canonical-source is a follow-up.
				const sourceRecipeByProduct = new Map<
					string,
					{ id: string; name: string }
				>();
				for (const r of sourceRecipes) {
					if (!r.producedProductId) continue;
					if (sourceRecipeByProduct.has(r.producedProductId)) continue;
					sourceRecipeByProduct.set(r.producedProductId, {
						id: r.id,
						name: r.name,
					});
				}

				const productMap = new Map(products.map((p) => [p.id, p]));
				const stockMap = new Map(
					stock.map((s) => [s.productId, Number(s.totalQuantity)]),
				);

				const graphCache = new Map<
					string,
					ReturnType<typeof buildConversionGraph>
				>();
				function graphFor(productId: string) {
					const cached = graphCache.get(productId);
					if (cached) return cached;
					const specific = productConversions.filter(
						(c) => c.productId === productId,
					);
					const g = buildConversionGraph([...globalConversions, ...specific]);
					graphCache.set(productId, g);
					return g;
				}

				// Group fulfillment rule with stock simulation: walk meal plan
				// entries chronologically, maintain a running stock map, and for
				// each (meal-plan-entry, group), pick the first ingredient whose
				// remaining stock covers that recipe's scaled need. Decrement
				// running stock for the picked winner so subsequent meals can't
				// re-claim the same units; drop the other group ingredients from
				// the shopping list. If no group ingredient is sufficient given
				// the running stock, none is dropped — all alternatives remain
				// in the aggregated shopping list. Ungrouped ingredients also
				// decrement running stock (after groups, so a group's
				// alternative gets first dibs on shared stock within a meal).
				const sortedEntries = [...entries].sort((a, b) => {
					const dateCmp = a.mealPlanEntryDate.localeCompare(
						b.mealPlanEntryDate,
					);
					if (dateCmp !== 0) return dateCmp;
					const mpeCmp = a.mealPlanEntryId.localeCompare(b.mealPlanEntryId);
					if (mpeCmp !== 0) return mpeCmp;
					return (a.ingredientSortOrder ?? 0) - (b.ingredientSortOrder ?? 0);
				});

				const entriesByMpe = new Map<string, typeof entries>();
				for (const e of sortedEntries) {
					const arr = entriesByMpe.get(e.mealPlanEntryId) ?? [];
					arr.push(e);
					entriesByMpe.set(e.mealPlanEntryId, arr);
				}

				const runningStock = new Map(stockMap);

				type Entry = (typeof entries)[number];
				function effectiveNeed(e: Entry): number | null {
					if (!e.ingredientProductId) return null;
					const p = productMap.get(e.ingredientProductId);
					if (!p) return null;
					const scaleFactor =
						(e.entryServings ?? e.recipeServings ?? 1) /
						(e.recipeServings ?? 1);
					const needed = Number(e.ingredientQuantity) * scaleFactor;
					const neededInStockUnit = tryConvert(
						graphFor(p.id),
						needed,
						e.ingredientUnitId,
						p.defaultQuantityUnitId,
					);
					if (
						e.ingredientUnitId !== p.defaultQuantityUnitId &&
						neededInStockUnit === null
					) {
						return null;
					}
					return neededInStockUnit ?? needed;
				}

				const skipKeys = new Set<string>();

				for (const mpeEntries of entriesByMpe.values()) {
					// Process groups first so the group's alternative gets first
					// claim on stock before ungrouped consumption draws it down.
					const groupsByName = new Map<string, Entry[]>();
					for (const e of mpeEntries) {
						if (!e.ingredientGroupName) continue;
						const arr = groupsByName.get(e.ingredientGroupName) ?? [];
						arr.push(e);
						groupsByName.set(e.ingredientGroupName, arr);
					}
					for (const groupEntries of groupsByName.values()) {
						if (groupEntries.length < 2) continue;
						let winner: Entry | null = null;
						let winnerNeed = 0;
						for (const e of groupEntries) {
							const need = effectiveNeed(e);
							if (need === null || !e.ingredientProductId) continue;
							const have = runningStock.get(e.ingredientProductId) ?? 0;
							if (have >= need) {
								winner = e;
								winnerNeed = need;
								break;
							}
						}
						if (!winner || !winner.ingredientProductId) continue;
						runningStock.set(
							winner.ingredientProductId,
							(runningStock.get(winner.ingredientProductId) ?? 0) - winnerNeed,
						);
						for (const e of groupEntries) {
							if (e.ingredientId !== winner.ingredientId) {
								skipKeys.add(`${e.mealPlanEntryId}::${e.ingredientId}`);
							}
						}
					}

					// Then ungrouped: decrement running stock so later meals see
					// the depletion. Going negative is fine — represents a
					// shortfall that the user will buy and use.
					for (const e of mpeEntries) {
						if (e.ingredientGroupName) continue;
						if (!e.ingredientProductId) continue;
						if (e.ingredientSkipStockDeduction) continue;
						const need = effectiveNeed(e);
						if (need === null) continue;
						runningStock.set(
							e.ingredientProductId,
							(runningStock.get(e.ingredientProductId) ?? 0) - need,
						);
					}
				}

				// Aggregate by (productId, quantityUnitId) — skipping rows the
				// group rule said are covered by an alternative.
				const linked = new Map<
					string,
					{
						productId: string;
						unitId: string | null;
						quantity: number;
						recipes: IngredientRecipeRef[];
					}
				>();
				const unlinked: {
					notes: string | null;
					quantity: string;
					unitId: string | null;
					scaleFactor: number;
					recipes: IngredientRecipeRef[];
				}[] = [];

				for (const entry of entries) {
					if (skipKeys.has(`${entry.mealPlanEntryId}::${entry.ingredientId}`)) {
						continue;
					}
					// Ingredients flagged skipStockDeduction are outside stock
					// accounting entirely — they don't get cooked-down from
					// inventory (cook flow already skips them), and they shouldn't
					// surface as deficit/restock on the shopping list either. Used
					// for things like water, salt/pepper to taste, etc.
					if (entry.ingredientSkipStockDeduction) continue;

					const scaleFactor =
						(entry.entryServings ?? entry.recipeServings ?? 1) /
						(entry.recipeServings ?? 1);
					const qty = Number(entry.ingredientQuantity) * scaleFactor;

					const recipeRef: IngredientRecipeRef = {
						recipeId: entry.recipeId,
						recipeName: entry.recipeName,
						mealPlanEntryId: entry.mealPlanEntryId,
						mealPlanEntryDate: entry.mealPlanEntryDate,
						quantity: qty,
					};

					if (!entry.ingredientProductId) {
						unlinked.push({
							notes: entry.ingredientNotes,
							quantity: entry.ingredientQuantity,
							unitId: entry.ingredientUnitId,
							scaleFactor,
							recipes: [recipeRef],
						});
						continue;
					}

					const key = `${entry.ingredientProductId}::${entry.ingredientUnitId ?? "null"}`;
					const existing = linked.get(key);
					if (existing) {
						existing.quantity += qty;
						existing.recipes.push(recipeRef);
					} else {
						linked.set(key, {
							productId: entry.ingredientProductId,
							unitId: entry.ingredientUnitId,
							quantity: qty,
							recipes: [recipeRef],
						});
					}
				}

				const linkedProductIds = [
					...new Set([...linked.values()].map((v) => v.productId)),
				];

				const ingredients: AggregatedIngredient[] = [];
				const producible: ProducibleIngredient[] = [];

				for (const agg of linked.values()) {
					const p = productMap.get(agg.productId);
					if (!p) continue;

					const unit = agg.unitId ? unitMap.get(agg.unitId) : null;
					const stockQty = stockMap.get(agg.productId) ?? 0;

					const sourceRecipe = sourceRecipeByProduct.get(agg.productId);
					if (sourceRecipe) {
						producible.push({
							productId: agg.productId,
							productName: p.name,
							quantityUnitId: agg.unitId,
							unitName: unit?.name ?? null,
							unitAbbreviation: unit?.abbreviation ?? null,
							neededQuantity: agg.quantity,
							stockQuantity: stockQty,
							sourceRecipeId: sourceRecipe.id,
							sourceRecipeName: sourceRecipe.name,
							recipes: agg.recipes,
						});
						continue;
					}

					// Try to convert needed quantity to product's default unit for comparison
					let neededInStockUnit = tryConvert(
						graphFor(p.id),
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
										graphFor(p.id),
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
						recipes: agg.recipes,
					});
				}

				// Restock: products with a min threshold, below min, not already
				// listed and not producible (producible products are surfaced for
				// cooking, not buying).
				const linkedIdSet = new Set(linkedProductIds);
				const restock: RestockItem[] = [];
				for (const p of trackedProducts) {
					if (linkedIdSet.has(p.id)) continue;
					if (sourceRecipeByProduct.has(p.id)) continue;
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

				const categoryRestock = await computeCategoryRestock(
					session.user.id,
					unitMap,
				);

				return json({
					ingredients,
					unlinkedIngredients: unlinked,
					restock,
					producible,
					categoryRestock,
				});
			},
		},
	},
});

async function computeCategoryRestock(
	userId: string,
	unitMap: Map<string, { name: string; abbreviation: string | null }>,
): Promise<CategoryRestockItem[]> {
	const minStockCategories = await db
		.select()
		.from(productCategoryType)
		.where(
			and(
				eq(productCategoryType.userId, userId),
				gt(productCategoryType.minStockAmount, "0"),
			),
		);
	if (minStockCategories.length === 0) return [];

	const categoryIds = minStockCategories.map((c) => c.id);
	const links = await db
		.select({
			categoryId: productCategory.categoryId,
			productId: productCategory.productId,
		})
		.from(productCategory)
		.where(inArray(productCategory.categoryId, categoryIds));

	const memberIds = [...new Set(links.map((l) => l.productId))];
	const productsByCategory = new Map<string, string[]>();
	for (const link of links) {
		const list = productsByCategory.get(link.categoryId) ?? [];
		list.push(link.productId);
		productsByCategory.set(link.categoryId, list);
	}

	const [memberProducts, memberStock, globalConversions, memberConversions] =
		memberIds.length > 0
			? await Promise.all([
					db
						.select({
							id: product.id,
							defaultQuantityUnitId: product.defaultQuantityUnitId,
						})
						.from(product)
						.where(
							and(eq(product.userId, userId), inArray(product.id, memberIds)),
						),
					db
						.select({
							productId: stockEntry.productId,
							totalQuantity: sql<string>`SUM(CAST(${stockEntry.quantity} AS numeric))`,
						})
						.from(stockEntry)
						.where(
							and(
								eq(stockEntry.userId, userId),
								inArray(stockEntry.productId, memberIds),
							),
						)
						.groupBy(stockEntry.productId),
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
								inArray(productUnitConversion.productId, memberIds),
							),
						),
				])
			: [[], [], [], []];

	const memberProductMap = new Map(memberProducts.map((p) => [p.id, p]));
	const memberStockMap = new Map(
		memberStock.map((s) => [s.productId, Number(s.totalQuantity)]),
	);

	const graphCache = new Map<string, ReturnType<typeof buildConversionGraph>>();
	function graphFor(productId: string) {
		const cached = graphCache.get(productId);
		if (cached) return cached;
		const specific = memberConversions.filter((c) => c.productId === productId);
		const g = buildConversionGraph([...globalConversions, ...specific]);
		graphCache.set(productId, g);
		return g;
	}

	const result: CategoryRestockItem[] = [];
	for (const cat of minStockCategories) {
		const memberPids = productsByCategory.get(cat.id) ?? [];
		if (memberPids.length === 0) continue;
		let total = 0;
		const contributingIds: string[] = [];
		for (const pid of memberPids) {
			const memberProduct = memberProductMap.get(pid);
			if (!memberProduct) continue;
			const memberStockQty = memberStockMap.get(pid) ?? 0;
			if (memberStockQty === 0) continue;
			if (
				!cat.minStockUnitId ||
				memberProduct.defaultQuantityUnitId === cat.minStockUnitId
			) {
				total += memberStockQty;
				contributingIds.push(pid);
				continue;
			}
			const converted = tryConvert(
				graphFor(pid),
				memberStockQty,
				memberProduct.defaultQuantityUnitId,
				cat.minStockUnitId,
			);
			if (converted === null) continue;
			total += converted;
			contributingIds.push(pid);
		}
		const minStock = Number(cat.minStockAmount);
		if (total >= minStock) continue;
		const unit = cat.minStockUnitId ? unitMap.get(cat.minStockUnitId) : null;
		result.push({
			categoryId: cat.id,
			categoryName: cat.name,
			minStock,
			stockQuantity: total,
			quantityUnitId: cat.minStockUnitId,
			unitName: unit?.name ?? null,
			unitAbbreviation: unit?.abbreviation ?? null,
			productIds: contributingIds,
		});
	}
	return result;
}
