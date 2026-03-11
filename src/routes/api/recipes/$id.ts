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

export const Route = createFileRoute("/api/recipes/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(recipe)
					.where(
						and(eq(recipe.id, params.id), eq(recipe.userId, session.user.id)),
					);

				if (!found) {
					return json({ error: "Not found" }, { status: 404 });
				}

				return json(found);
			},
			PUT: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const updates: Record<string, unknown> = {};

				if (body.name !== undefined) updates.name = body.name;
				if (body.description !== undefined)
					updates.description = body.description;
				if (body.servings !== undefined) updates.servings = body.servings;
				if (body.prepTime !== undefined) updates.prepTime = body.prepTime;
				if (body.cookTime !== undefined) updates.cookTime = body.cookTime;
				if (body.instructions !== undefined)
					updates.instructions = body.instructions;
				if (body.image !== undefined) updates.image = body.image;
				if (body.categoryId !== undefined) updates.categoryId = body.categoryId;

				const [updated] = await db
					.update(recipe)
					.set(updates)
					.where(
						and(eq(recipe.id, params.id), eq(recipe.userId, session.user.id)),
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
					.delete(recipe)
					.where(
						and(eq(recipe.id, params.id), eq(recipe.userId, session.user.id)),
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
