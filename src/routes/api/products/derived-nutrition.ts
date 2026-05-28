import { createFileRoute } from "@tanstack/react-router";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "#src/db";
import {
	product,
	productUnitConversion,
	recipe,
	recipeIngredient,
	unitConversion,
} from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import { buildConversionGraph } from "#src/lib/recipe-utils/conversion-graph";
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

export const Route = createFileRoute("/api/products/derived-nutrition")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				// Recipes that produce a product, scoped to this user.
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
							isNotNull(recipe.producedProductId),
						),
					);

				if (sourceRecipes.length === 0) {
					return json({} as Record<string, DerivedNutrition>);
				}

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

				const productConversions =
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

				const conversions = await db
					.select()
					.from(unitConversion)
					.where(eq(unitConversion.userId, session.user.id));

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
					const g = buildConversionGraph([...conversions, ...specific]);
					graphCache.set(productId, g);
					return g;
				}

				const ingredientsByRecipe = new Map<string, typeof sourceIngredients>();
				for (const ing of sourceIngredients) {
					const arr = ingredientsByRecipe.get(ing.recipeId) ?? [];
					arr.push(ing);
					ingredientsByRecipe.set(ing.recipeId, arr);
				}

				// First-wins: if multiple recipes produce the same product, the
				// first one we get back is the canonical source.
				const result: Record<string, DerivedNutrition> = {};
				for (const r of sourceRecipes) {
					if (!r.producedProductId) continue;
					if (result[r.producedProductId]) continue;
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
						graphFor,
					});

					if (derived) result[r.producedProductId] = derived;
				}

				return json(result);
			},
		},
	},
});
