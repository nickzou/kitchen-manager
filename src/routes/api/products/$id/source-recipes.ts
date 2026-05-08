import { createFileRoute } from "@tanstack/react-router";
import { and, eq, inArray } from "drizzle-orm";
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
	deriveProductNutrition,
	type ProductForNutrition,
} from "#src/lib/recipe-utils/derive-product-nutrition";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/products/$id/source-recipes")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const recipes = await db
					.select({
						id: recipe.id,
						name: recipe.name,
						producedQuantity: recipe.producedQuantity,
						producedQuantityUnitId: recipe.producedQuantityUnitId,
					})
					.from(recipe)
					.where(
						and(
							eq(recipe.producedProductId, params.id),
							eq(recipe.userId, session.user.id),
						),
					);

				if (recipes.length === 0) {
					return json([]);
				}

				const recipeIds = recipes.map((r) => r.id);
				const ingredients = await db
					.select({
						recipeId: recipeIngredient.recipeId,
						productId: recipeIngredient.productId,
						quantity: recipeIngredient.quantity,
						quantityUnitId: recipeIngredient.quantityUnitId,
					})
					.from(recipeIngredient)
					.where(inArray(recipeIngredient.recipeId, recipeIds));

				const ingredientProductIds = [
					...new Set(
						ingredients
							.map((i) => i.productId)
							.filter((id): id is string => Boolean(id)),
					),
				];

				const [ingredientProducts, globalConversions, productConversions] =
					await Promise.all([
						ingredientProductIds.length > 0
							? db
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
							: Promise.resolve([] as never[]),
						db
							.select()
							.from(unitConversion)
							.where(eq(unitConversion.userId, session.user.id)),
						ingredientProductIds.length > 0
							? db
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
							: Promise.resolve([] as never[]),
					]);

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
					const g = buildConversionGraph([...globalConversions, ...specific]);
					graphCache.set(productId, g);
					return g;
				}

				const ingredientsByRecipe = new Map<string, typeof ingredients>();
				for (const ing of ingredients) {
					const arr = ingredientsByRecipe.get(ing.recipeId) ?? [];
					arr.push(ing);
					ingredientsByRecipe.set(ing.recipeId, arr);
				}

				const enriched = recipes.map((r) => {
					const ings = (ingredientsByRecipe.get(r.id) ?? [])
						.filter(
							(i): i is (typeof ingredients)[number] & { productId: string } =>
								Boolean(i.productId),
						)
						.map((i) => ({
							productId: i.productId,
							quantity: i.quantity,
							quantityUnitId: i.quantityUnitId,
						}));
					const derivedNutrition = deriveProductNutrition({
						recipe: {
							producedQuantity: r.producedQuantity,
							producedQuantityUnitId: r.producedQuantityUnitId,
						},
						ingredients: ings,
						products: productMap,
						graphFor,
					});
					return { ...r, derivedNutrition };
				});

				return json(enriched);
			},
		},
	},
});
