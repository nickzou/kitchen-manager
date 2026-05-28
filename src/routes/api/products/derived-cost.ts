import { createFileRoute } from "@tanstack/react-router";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "#src/db";
import {
	product,
	productUnitConversion,
	recipe,
	recipeIngredient,
	stockEntry,
	unitConversion,
} from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import { buildConversionGraph } from "#src/lib/recipe-utils/conversion-graph";
import {
	type DerivedCost,
	deriveProductCost,
} from "#src/lib/recipe-utils/derive-product-cost";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/products/derived-cost")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

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
					return json({} as Record<string, DerivedCost>);
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
								})
								.from(product)
								.where(
									and(
										eq(product.userId, session.user.id),
										inArray(product.id, ingredientProductIds),
									),
								)
						: [];

				const stockEntries =
					ingredientProductIds.length > 0
						? await db
								.select({
									productId: stockEntry.productId,
									unitCost: stockEntry.unitCost,
								})
								.from(stockEntry)
								.where(
									and(
										eq(stockEntry.userId, session.user.id),
										inArray(stockEntry.productId, ingredientProductIds),
									),
								)
						: [];

				const costsByProduct = new Map<string, number[]>();
				for (const e of stockEntries) {
					if (e.unitCost === null) continue;
					const arr = costsByProduct.get(e.productId) ?? [];
					arr.push(Number(e.unitCost));
					costsByProduct.set(e.productId, arr);
				}

				const productMap = new Map<
					string,
					{ defaultQuantityUnitId: string | null; avgUnitCost: number | null }
				>();
				for (const p of ingredientProducts) {
					const costs = costsByProduct.get(p.id) ?? [];
					const avg =
						costs.length > 0
							? costs.reduce((s, c) => s + c, 0) / costs.length
							: null;
					productMap.set(p.id, {
						defaultQuantityUnitId: p.defaultQuantityUnitId,
						avgUnitCost: avg,
					});
				}

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

				const result: Record<string, DerivedCost> = {};
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

					const derived = deriveProductCost({
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
