import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { recipeIngredient } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute(
	"/api/recipes/$id/ingredients/$ingredientId",
)({
	server: {
		handlers: {
			PUT: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const updates: Record<string, unknown> = {};

				if (body.productId !== undefined) updates.productId = body.productId;
				if (body.quantity !== undefined) updates.quantity = body.quantity;
				if (body.quantityUnitId !== undefined)
					updates.quantityUnitId = body.quantityUnitId;
				if (body.notes !== undefined) updates.notes = body.notes;
				if (body.groupName !== undefined) updates.groupName = body.groupName;
				if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
				if (body.optional !== undefined) updates.optional = body.optional;
				if (body.skipStockDeduction !== undefined)
					updates.skipStockDeduction = body.skipStockDeduction;

				const [updated] = await db
					.update(recipeIngredient)
					.set(updates)
					.where(
						and(
							eq(recipeIngredient.id, params.ingredientId),
							eq(recipeIngredient.recipeId, params.id),
							eq(recipeIngredient.userId, session.user.id),
						),
					)
					.returning();

				if (!updated) {
					return json({ error: "Not found" }, { status: 404 });
				}

				return json(updated);
			},
			DELETE: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [deleted] = await db
					.delete(recipeIngredient)
					.where(
						and(
							eq(recipeIngredient.id, params.ingredientId),
							eq(recipeIngredient.recipeId, params.id),
							eq(recipeIngredient.userId, session.user.id),
						),
					)
					.returning();

				if (!deleted) {
					return json({ error: "Not found" }, { status: 404 });
				}

				return json(deleted);
			},
		},
	},
});
