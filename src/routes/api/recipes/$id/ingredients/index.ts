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

export const Route = createFileRoute("/api/recipes/$id/ingredients/")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const ingredients = await db
					.select()
					.from(recipeIngredient)
					.where(
						and(
							eq(recipeIngredient.recipeId, params.id),
							eq(recipeIngredient.userId, session.user.id),
						),
					);

				return json(ingredients);
			},
			POST: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				if (!body.quantity) {
					return json({ error: "Quantity is required" }, { status: 400 });
				}

				const [created] = await db
					.insert(recipeIngredient)
					.values({
						recipeId: params.id,
						productId: body.productId,
						quantity: body.quantity,
						quantityUnitId: body.quantityUnitId,
						notes: body.notes,
						sortOrder: body.sortOrder,
						userId: session.user.id,
					})
					.returning();

				return json(created, { status: 201 });
			},
		},
	},
});
