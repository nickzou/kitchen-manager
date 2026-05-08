import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "#src/db";
import {
	mealPlanEntry,
	product,
	productUnitConversion,
	recipe,
	recipeIngredient,
	unitConversion,
} from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import {
	buildConversionGraph,
	tryConvert,
} from "#src/lib/recipe-utils/conversion-graph";
import {
	type DerivedNutrition,
	deriveProductNutrition,
	type ProductForNutrition,
} from "#src/lib/recipe-utils/derive-product-nutrition";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute(
	"/api/meal-plan-entries/nutrition-summary",
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

				const rows = await db
					.select({
						date: mealPlanEntry.date,
						mealPlanEntryId: mealPlanEntry.id,
						entryServings: mealPlanEntry.servings,
						recipeServings: recipe.servings,
						ingredientQuantity: recipeIngredient.quantity,
						ingredientUnitId: recipeIngredient.quantityUnitId,
						ingredientGroupName: recipeIngredient.groupName,
						productId: recipeIngredient.productId,
						productDefaultUnitId: product.defaultQuantityUnitId,
						productNutritionBaseAmount: product.nutritionBaseAmount,
						productNutritionBaseUnitId: product.nutritionBaseUnitId,
						productCalories: product.calories,
						productProtein: product.protein,
						productFat: product.fat,
						productCarbs: product.carbs,
					})
					.from(mealPlanEntry)
					.innerJoin(recipe, eq(mealPlanEntry.recipeId, recipe.id))
					.innerJoin(recipeIngredient, eq(recipe.id, recipeIngredient.recipeId))
					.innerJoin(product, eq(recipeIngredient.productId, product.id))
					.where(
						and(
							eq(mealPlanEntry.userId, session.user.id),
							gte(mealPlanEntry.date, startDate),
							lte(mealPlanEntry.date, endDate),
						),
					);

				const conversions = await db
					.select()
					.from(unitConversion)
					.where(eq(unitConversion.userId, session.user.id));

				// For ingredients whose product has no own nutrition, derive it
				// from the source recipe (the one that produces the product).
				// Pull source recipes, their ingredients, and the nutrition data
				// for those ingredients' products in batched queries.
				const producibleProductIds = [
					...new Set(
						rows
							.filter(
								(r) =>
									!r.productCalories &&
									!r.productProtein &&
									!r.productFat &&
									!r.productCarbs &&
									r.productId,
							)
							.map((r) => r.productId as string),
					),
				];

				const derivedByProduct = new Map<string, DerivedNutrition>();

				if (producibleProductIds.length > 0) {
					const sourceRecipes = await db
						.select({
							id: recipe.id,
							producedProductId: recipe.producedProductId,
							producedQuantity: recipe.producedQuantity,
							producedQuantityUnitId: recipe.producedQuantityUnitId,
						})
						.from(recipe)
						.where(
							and(
								eq(recipe.userId, session.user.id),
								inArray(recipe.producedProductId, producibleProductIds),
							),
						);

					if (sourceRecipes.length > 0) {
						const sourceRecipeIds = sourceRecipes.map((r) => r.id);
						const sourceIngredients = await db
							.select({
								recipeId: recipeIngredient.recipeId,
								productId: recipeIngredient.productId,
								quantity: recipeIngredient.quantity,
								quantityUnitId: recipeIngredient.quantityUnitId,
							})
							.from(recipeIngredient)
							.where(inArray(recipeIngredient.recipeId, sourceRecipeIds));

						const ingredientProductIds = [
							...new Set(
								sourceIngredients
									.map((i) => i.productId)
									.filter((id): id is string => Boolean(id)),
							),
						];

						const ingredientProducts =
							ingredientProductIds.length > 0
								? await db
										.select({
											id: product.id,
											defaultQuantityUnitId: product.defaultQuantityUnitId,
											nutritionBaseAmount: product.nutritionBaseAmount,
											nutritionBaseUnitId: product.nutritionBaseUnitId,
											calories: product.calories,
											protein: product.protein,
											fat: product.fat,
											carbs: product.carbs,
										})
										.from(product)
										.where(
											and(
												eq(product.userId, session.user.id),
												inArray(product.id, ingredientProductIds),
											),
										)
								: [];

						const ingredientProductConversions =
							ingredientProductIds.length > 0
								? await db
										.select()
										.from(productUnitConversion)
										.where(
											and(
												eq(productUnitConversion.userId, session.user.id),
												inArray(
													productUnitConversion.productId,
													ingredientProductIds,
												),
											),
										)
								: [];

						const productMap = new Map<string, ProductForNutrition>();
						for (const p of ingredientProducts) {
							productMap.set(p.id, {
								defaultQuantityUnitId: p.defaultQuantityUnitId,
								nutritionBaseAmount: p.nutritionBaseAmount,
								nutritionBaseUnitId: p.nutritionBaseUnitId,
								calories: p.calories,
								protein: p.protein,
								fat: p.fat,
								carbs: p.carbs,
							});
						}

						const derivedGraphCache = new Map<
							string,
							ReturnType<typeof buildConversionGraph>
						>();
						function derivedGraphFor(productId: string) {
							const cached = derivedGraphCache.get(productId);
							if (cached) return cached;
							const specific = ingredientProductConversions.filter(
								(c) => c.productId === productId,
							);
							const g = buildConversionGraph([...conversions, ...specific]);
							derivedGraphCache.set(productId, g);
							return g;
						}

						const ingredientsByRecipe = new Map<
							string,
							typeof sourceIngredients
						>();
						for (const ing of sourceIngredients) {
							const arr = ingredientsByRecipe.get(ing.recipeId) ?? [];
							arr.push(ing);
							ingredientsByRecipe.set(ing.recipeId, arr);
						}

						for (const r of sourceRecipes) {
							if (!r.producedProductId) continue;
							// First-wins: a product produced by multiple recipes uses
							// the first one we get back. The user can later pin a
							// canonical recipe per product if this becomes ambiguous.
							if (derivedByProduct.has(r.producedProductId)) continue;
							const ings = (ingredientsByRecipe.get(r.id) ?? [])
								.filter(
									(
										i,
									): i is (typeof sourceIngredients)[number] & {
										productId: string;
									} => Boolean(i.productId),
								)
								.map((i) => ({
									productId: i.productId,
									quantity: i.quantity,
									quantityUnitId: i.quantityUnitId,
								}));
							const derived = deriveProductNutrition({
								recipe: {
									producedQuantity: r.producedQuantity,
									producedQuantityUnitId: r.producedQuantityUnitId,
								},
								ingredients: ings,
								products: productMap,
								graphFor: derivedGraphFor,
							});
							if (derived) derivedByProduct.set(r.producedProductId, derived);
						}
					}
				}

				const graph = buildConversionGraph(conversions);

				type Nutrition = {
					calories: number;
					protein: number;
					fat: number;
					carbs: number;
				};
				const blank = (): Nutrition => ({
					calories: 0,
					protein: 0,
					fat: 0,
					carbs: 0,
				});

				const summary: Record<string, Nutrition> = {};
				const groupBuckets = new Map<
					string,
					{ date: string; contributions: Nutrition[] }
				>();

				for (const row of rows) {
					let cal: number;
					let prot: number;
					let fat: number;
					let carb: number;
					let baseAmount: number;
					let baseUnitId: string | null;

					const hasOwn =
						row.productCalories ||
						row.productProtein ||
						row.productFat ||
						row.productCarbs;

					if (hasOwn) {
						cal = row.productCalories ? Number(row.productCalories) : 0;
						prot = row.productProtein ? Number(row.productProtein) : 0;
						fat = row.productFat ? Number(row.productFat) : 0;
						carb = row.productCarbs ? Number(row.productCarbs) : 0;
						baseAmount = Number(row.productNutritionBaseAmount ?? "1") || 1;
						baseUnitId =
							row.productNutritionBaseUnitId ?? row.productDefaultUnitId;
					} else {
						const derived = row.productId
							? derivedByProduct.get(row.productId)
							: undefined;
						if (!derived) continue;
						cal = derived.calories;
						prot = derived.protein;
						fat = derived.fat;
						carb = derived.carbs;
						baseAmount = derived.baseAmount;
						baseUnitId = derived.baseUnitId;
					}

					const scaleFactor =
						(row.entryServings ?? row.recipeServings ?? 1) /
						(row.recipeServings ?? 1);

					const convertedQty = tryConvert(
						graph,
						Number(row.ingredientQuantity),
						row.ingredientUnitId,
						baseUnitId,
					);
					if (convertedQty === null) continue;

					const multiplier = (convertedQty * scaleFactor) / baseAmount;
					const contribution: Nutrition = {
						calories: cal * multiplier,
						protein: prot * multiplier,
						fat: fat * multiplier,
						carbs: carb * multiplier,
					};

					if (row.ingredientGroupName) {
						const key = `${row.mealPlanEntryId}::${row.ingredientGroupName}`;
						const bucket = groupBuckets.get(key) ?? {
							date: row.date,
							contributions: [],
						};
						bucket.contributions.push(contribution);
						groupBuckets.set(key, bucket);
					} else {
						const day = summary[row.date] ?? blank();
						day.calories += contribution.calories;
						day.protein += contribution.protein;
						day.fat += contribution.fat;
						day.carbs += contribution.carbs;
						summary[row.date] = day;
					}
				}

				for (const { date, contributions } of groupBuckets.values()) {
					if (contributions.length === 0) continue;
					const n = contributions.length;
					const day = summary[date] ?? blank();
					day.calories += contributions.reduce((s, c) => s + c.calories, 0) / n;
					day.protein += contributions.reduce((s, c) => s + c.protein, 0) / n;
					day.fat += contributions.reduce((s, c) => s + c.fat, 0) / n;
					day.carbs += contributions.reduce((s, c) => s + c.carbs, 0) / n;
					summary[date] = day;
				}

				return json(summary);
			},
		},
	},
});
