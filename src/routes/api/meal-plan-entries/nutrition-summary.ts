import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "#src/db";
import {
	mealPlanEntry,
	product,
	recipe,
	recipeIngredient,
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
						entryServings: mealPlanEntry.servings,
						recipeServings: recipe.servings,
						ingredientQuantity: recipeIngredient.quantity,
						ingredientUnitId: recipeIngredient.quantityUnitId,
						productId: recipeIngredient.productId,
						productDefaultUnitId: product.defaultQuantityUnitId,
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

				const graph = buildConversionGraph(conversions);

				const summary: Record<
					string,
					{ calories: number; protein: number; fat: number; carbs: number }
				> = {};

				for (const row of rows) {
					if (
						!row.productCalories &&
						!row.productProtein &&
						!row.productFat &&
						!row.productCarbs
					)
						continue;

					const scaleFactor =
						(row.entryServings ?? row.recipeServings ?? 1) /
						(row.recipeServings ?? 1);

					const convertedQty = tryConvert(
						graph,
						Number(row.ingredientQuantity),
						row.ingredientUnitId,
						row.productDefaultUnitId,
					);
					if (convertedQty === null) continue;

					const qty = convertedQty * scaleFactor;

					if (!summary[row.date]) {
						summary[row.date] = {
							calories: 0,
							protein: 0,
							fat: 0,
							carbs: 0,
						};
					}

					const day = summary[row.date];
					if (row.productCalories)
						day.calories += Number(row.productCalories) * qty;
					if (row.productProtein)
						day.protein += Number(row.productProtein) * qty;
					if (row.productFat) day.fat += Number(row.productFat) * qty;
					if (row.productCarbs) day.carbs += Number(row.productCarbs) * qty;
				}

				return json(summary);
			},
		},
	},
});
