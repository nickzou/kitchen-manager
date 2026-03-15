import { createFileRoute } from "@tanstack/react-router";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "#src/db";
import { recipe, recipeIngredient, stockEntry, stockLog } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/recipes/cook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const { recipeId, servings, groupSelections } = body;

				if (!recipeId) {
					return json({ error: "recipeId is required" }, { status: 400 });
				}

				const result = await db.transaction(async (tx) => {
					const [rec] = await tx
						.select()
						.from(recipe)
						.where(
							and(eq(recipe.id, recipeId), eq(recipe.userId, session.user.id)),
						);

					if (!rec) {
						return { error: "Recipe not found", status: 404 };
					}

					const ingredients = await tx
						.select()
						.from(recipeIngredient)
						.where(eq(recipeIngredient.recipeId, rec.id));

					const scaleFactor =
						(servings ?? rec.servings ?? 1) / (rec.servings ?? 1);

					// Build set of ingredient IDs to skip based on group selections
					const skipIds = new Set<string>();
					const groups = new Map<string, typeof ingredients>();
					for (const ing of ingredients) {
						if (ing.groupName) {
							if (!groups.has(ing.groupName)) {
								groups.set(ing.groupName, []);
							}
							groups.get(ing.groupName)?.push(ing);
						}
					}

					for (const [groupName, groupIngredients] of groups) {
						const selectedId = groupSelections?.[groupName];
						if (!selectedId) {
							return {
								error: `Missing selection for group "${groupName}"`,
								status: 400,
							};
						}
						for (const ing of groupIngredients) {
							if (ing.id !== selectedId) {
								skipIds.add(ing.id);
							}
						}
					}

					const warnings: string[] = [];
					const deductions: {
						productId: string;
						needed: number;
						deducted: number;
					}[] = [];

					// FIFO deduction for each linked ingredient
					for (const ingredient of ingredients) {
						if (!ingredient.productId) continue;
						if (skipIds.has(ingredient.id)) continue;

						const needed = Number(ingredient.quantity) * scaleFactor;

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

					// Production: if recipe produces a product, add to stock
					let produced: { productId: string; quantity: number } | undefined;

					if (rec.producedProductId && rec.producedQuantity) {
						const producedQty = Number(rec.producedQuantity) * scaleFactor;

						const [newEntry] = await tx
							.insert(stockEntry)
							.values({
								productId: rec.producedProductId,
								quantity: producedQty.toString(),
								userId: session.user.id,
							})
							.returning();

						await tx.insert(stockLog).values({
							stockEntryId: newEntry.id,
							productId: rec.producedProductId,
							transactionType: "add",
							quantity: producedQty.toString(),
							userId: session.user.id,
						});

						produced = {
							productId: rec.producedProductId,
							quantity: producedQty,
						};
					}

					return { deductions, warnings, produced, status: 200 };
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
					produced: result.produced,
				});
			},
		},
	},
});
