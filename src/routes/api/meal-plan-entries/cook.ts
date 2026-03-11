import { createFileRoute } from "@tanstack/react-router";
import { and, asc, desc, eq, sql } from "drizzle-orm";
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
			DELETE: async ({ request }) => {
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

					if (!entry.cookedAt) {
						return { error: "Entry has not been cooked", status: 400 };
					}

					// Find consume logs created after cookedAt for this entry's ingredients
					const [rec] = await tx
						.select()
						.from(recipe)
						.where(eq(recipe.id, entry.recipeId));

					if (!rec) {
						return { error: "Recipe not found", status: 404 };
					}

					const ingredients = await tx
						.select()
						.from(recipeIngredient)
						.where(eq(recipeIngredient.recipeId, rec.id));

					const scaleFactor =
						(entry.servings ?? rec.servings ?? 1) / (rec.servings ?? 1);

					// Re-add stock for each linked ingredient
					for (const ingredient of ingredients) {
						if (!ingredient.productId) continue;

						const needed = Number(ingredient.quantity) * scaleFactor;

						// Find the consume logs created around cookedAt for this product
						const logs = await tx
							.select()
							.from(stockLog)
							.where(
								and(
									eq(stockLog.productId, ingredient.productId),
									eq(stockLog.userId, session.user.id),
									eq(stockLog.transactionType, "consume"),
									sql`${stockLog.createdAt} >= ${entry.cookedAt}`,
								),
							)
							.orderBy(desc(stockLog.createdAt))
							.limit(10);

						// Reverse the deductions by adding back to stock entries
						let toRestore = needed;
						for (const log of logs) {
							if (toRestore <= 0) break;

							const logQty = Number(log.quantity);
							const restore = Math.min(logQty, toRestore);

							if (log.stockEntryId) {
								const [stock] = await tx
									.select()
									.from(stockEntry)
									.where(eq(stockEntry.id, log.stockEntryId));

								if (stock) {
									const newQty = (
										Number(stock.quantity) + restore
									).toString();
									await tx
										.update(stockEntry)
										.set({ quantity: newQty })
										.where(eq(stockEntry.id, stock.id));
								}
							}

							await tx.insert(stockLog).values({
								stockEntryId: log.stockEntryId,
								productId: ingredient.productId,
								transactionType: "add",
								quantity: restore.toString(),
								userId: session.user.id,
							});

							toRestore -= restore;
						}
					}

					// Clear cookedAt
					await tx
						.update(mealPlanEntry)
						.set({ cookedAt: null })
						.where(eq(mealPlanEntry.id, mealPlanEntryId));

					return { status: 200 };
				});

				if ("error" in result) {
					return json(
						{ error: result.error },
						{ status: result.status as number },
					);
				}

				return json({ success: true });
			},
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
