import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { product } from "#/db/schema";
import { getAuthSession } from "#/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/products/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(product)
					.where(
						and(eq(product.id, params.id), eq(product.userId, session.user.id)),
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
				if (body.category !== undefined) updates.category = body.category;
				if (body.description !== undefined)
					updates.description = body.description;
				if (body.image !== undefined) updates.image = body.image;
				if (body.expirationDate !== undefined)
					updates.expirationDate = body.expirationDate
						? new Date(body.expirationDate)
						: null;

				const [updated] = await db
					.update(product)
					.set(updates)
					.where(
						and(eq(product.id, params.id), eq(product.userId, session.user.id)),
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
					.delete(product)
					.where(
						and(eq(product.id, params.id), eq(product.userId, session.user.id)),
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
