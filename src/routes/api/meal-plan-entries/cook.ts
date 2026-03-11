import { createFileRoute } from "@tanstack/react-router";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "#src/db";
import {
	mealPlanEntry,
	recipe,
	recipeIngredient,
	stockEntry,
	stockLog,
} from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/meal-plan-entries/cook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const { mealPlanEntryId } = body;

				if (!mealPlanEntryId) {
					return json(
						{ error: "mealPlanEntryId is required" },
						{ status: 400 },
					);
				}

				const result = await db.transaction(async (tx) => {
					// Get the meal plan entry
					const [entry] = await tx
						.select()
						.from(mealPlanEntry)
						.where(
							and(
								eq(mealPlanEntry.id, mealPlanEntryId),
								eq(mealPlanEntry.userId, session.user.id),
							),
						);

					if (!entry) {
						return { error: "Meal plan entry not found", status: 404 };
					}

					if (entry.cookedAt) {
						return { error: "Already cooked", status: 400 };
					}

					// Get the recipe
					const [rec] = await tx
						.select()
						.from(recipe)
						.where(eq(recipe.id, entry.recipeId));

					if (!rec) {
						return { error: "Recipe not found", status: 404 };
					}

					// Get recipe ingredients
					const ingredients = await tx
						.select()
						.from(recipeIngredient)
						.where(eq(recipeIngredient.recipeId, rec.id));

					const scaleFactor =
						(entry.servings ?? rec.servings ?? 1) / (rec.servings ?? 1);

					const warnings: string[] = [];
					const deductions: {
						productId: string;
						needed: number;
						deducted: number;
					}[] = [];

					// FIFO deduction for each linked ingredient
					for (const ingredient of ingredients) {
						if (!ingredient.productId) continue;

						const needed = Number(ingredient.quantity) * scaleFactor;

						// Get stock entries ordered by expiration (FIFO - oldest first)
						const stocks = await tx
							.select()
							.from(stockEntry)
							.where(
								and(
									eq(stockEntry.productId, ingredient.productId),
									eq(stockEntry.userId, session.user.id),
									sql`CAST(${stockEntry.quantity} AS numeric) > 0`,
								),
							)
							.orderBy(asc(stockEntry.expirationDate));

						let remaining = needed;
						let totalDeducted = 0;

						for (const stock of stocks) {
							if (remaining <= 0) break;

							const available = Number(stock.quantity);
							const deduct = Math.min(available, remaining);
							const newQty = (available - deduct).toString();

							await tx
								.update(stockEntry)
								.set({ quantity: newQty })
								.where(eq(stockEntry.id, stock.id));

							await tx.insert(stockLog).values({
								stockEntryId: stock.id,
								productId: ingredient.productId,
								transactionType: "consume",
								quantity: deduct.toString(),
								userId: session.user.id,
							});

							remaining -= deduct;
							totalDeducted += deduct;
						}

						deductions.push({
							productId: ingredient.productId,
							needed,
							deducted: totalDeducted,
						});

						if (remaining > 0) {
							warnings.push(
								`Insufficient stock for product ${ingredient.productId}: needed ${needed}, only deducted ${totalDeducted}`,
							);
						}
					}

					await tx
						.update(mealPlanEntry)
						.set({ cookedAt: new Date() })
						.where(eq(mealPlanEntry.id, mealPlanEntryId));

					return { deductions, warnings, status: 200 };
				});

				if ("error" in result) {
					return json(
						{ error: result.error },
						{ status: result.status as number },
					);
				}

				return json({
					success: true,
					deductions: result.deductions,
					warnings: result.warnings,
				});
			},
		},
	},
});
