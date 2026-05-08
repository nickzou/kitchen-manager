import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "#src/db";
import {
	mealPlanEntry,
	product,
	productUnitConversion,
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

interface DayCost {
	total: number;
	// True if every priced ingredient on this day was successfully unit-
	// converted into its product's default unit. False when any ingredient
	// was skipped for a missing avg cost or unit-conversion gap, so the UI
	// can hint that the day's total is partial.
	complete: boolean;
}

export const Route = createFileRoute("/api/meal-plan-entries/cost-summary")({
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

				if (rows.length === 0) return json({});

				const productIds = [
					...new Set(
						rows
							.map((r) => r.productId)
							.filter((id): id is string => Boolean(id)),
					),
				];

				const [avgCostRows, globalConversions, productConversions] =
					await Promise.all([
						db
							.select({
								productId: stockEntry.productId,
								avgCost: sql<string>`AVG(CAST(${stockEntry.unitCost} AS numeric))`,
							})
							.from(stockEntry)
							.where(
								and(
									eq(stockEntry.userId, session.user.id),
									inArray(stockEntry.productId, productIds),
									sql`${stockEntry.unitCost} IS NOT NULL`,
								),
							)
							.groupBy(stockEntry.productId),
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
					]);

				const avgCostMap = new Map(
					avgCostRows.map((r) => [r.productId, Number(r.avgCost)]),
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

				const summary: Record<string, DayCost> = {};
				// Group alternatives are averaged per (date, entry, group) to mirror
				// the nutrition summary — pick-one-of-N rather than buy-all-of-N.
				const groupBuckets = new Map<
					string,
					{ date: string; contributions: number[] }
				>();

				const incompleteByDate = new Set<string>();

				for (const row of rows) {
					if (!row.productId) continue;
					const avgCost = avgCostMap.get(row.productId);
					if (avgCost === undefined) {
						incompleteByDate.add(row.date);
						continue;
					}

					const scaleFactor =
						(row.entryServings ?? row.recipeServings ?? 1) /
						(row.recipeServings ?? 1);

					// avgCost is per the product's default unit; convert ingredient
					// qty into that unit.
					const convertedQty = tryConvert(
						graphFor(row.productId),
						Number(row.ingredientQuantity),
						row.ingredientUnitId,
						row.productDefaultUnitId,
					);
					if (convertedQty === null) {
						incompleteByDate.add(row.date);
						continue;
					}

					const contribution = convertedQty * scaleFactor * avgCost;

					if (row.ingredientGroupName) {
						const key = `${row.mealPlanEntryId}::${row.ingredientGroupName}`;
						const bucket = groupBuckets.get(key) ?? {
							date: row.date,
							contributions: [],
						};
						bucket.contributions.push(contribution);
						groupBuckets.set(key, bucket);
					} else {
						const day = summary[row.date] ?? { total: 0, complete: true };
						day.total += contribution;
						summary[row.date] = day;
					}
				}

				for (const { date, contributions } of groupBuckets.values()) {
					if (contributions.length === 0) continue;
					const avg =
						contributions.reduce((s, c) => s + c, 0) / contributions.length;
					const day = summary[date] ?? { total: 0, complete: true };
					day.total += avg;
					summary[date] = day;
				}

				for (const date of incompleteByDate) {
					const day = summary[date] ?? { total: 0, complete: true };
					day.complete = false;
					summary[date] = day;
				}

				return json(summary);
			},
		},
	},
});
