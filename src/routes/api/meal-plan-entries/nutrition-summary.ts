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
				// Group alternatives are bucketed per (date, entry, group) so each
				// recipe occurrence's group is averaged independently. Sums of
				// each bucket roll into the day's total after averaging.
				const groupBuckets = new Map<
					string,
					{ date: string; contributions: Nutrition[] }
				>();

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

					// Honor the product's nutrition base (e.g. "350 cal per 100 g").
					// Convert the ingredient qty into that base unit, then divide by
					// the base amount to get the multiplier.
					const baseUnitId =
						row.productNutritionBaseUnitId ?? row.productDefaultUnitId;
					const baseAmount = Number(row.productNutritionBaseAmount ?? "1") || 1;
					const convertedQty = tryConvert(
						graph,
						Number(row.ingredientQuantity),
						row.ingredientUnitId,
						baseUnitId,
					);
					if (convertedQty === null) continue;

					const multiplier = (convertedQty * scaleFactor) / baseAmount;
					const contribution: Nutrition = {
						calories: row.productCalories
							? Number(row.productCalories) * multiplier
							: 0,
						protein: row.productProtein
							? Number(row.productProtein) * multiplier
							: 0,
						fat: row.productFat ? Number(row.productFat) * multiplier : 0,
						carbs: row.productCarbs ? Number(row.productCarbs) * multiplier : 0,
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
