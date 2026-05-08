import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { recipe } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

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

				return json(recipes);
			},
		},
	},
});
