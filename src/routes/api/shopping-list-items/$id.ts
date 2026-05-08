import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { shoppingListItem } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/shopping-list-items/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}
				const [item] = await db
					.select()
					.from(shoppingListItem)
					.where(
						and(
							eq(shoppingListItem.id, params.id),
							eq(shoppingListItem.userId, session.user.id),
						),
					);
				if (!item) return json({ error: "Not found" }, { status: 404 });
				return json(item);
			},
			PUT: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}
				const body = await request.json();
				const updates: Record<string, unknown> = {};
				if (body.productId !== undefined) updates.productId = body.productId;
				if (body.quantity !== undefined)
					updates.quantity = String(body.quantity);
				if (body.quantityUnitId !== undefined)
					updates.quantityUnitId = body.quantityUnitId;
				const [updated] = await db
					.update(shoppingListItem)
					.set(updates)
					.where(
						and(
							eq(shoppingListItem.id, params.id),
							eq(shoppingListItem.userId, session.user.id),
						),
					)
					.returning();
				if (!updated) return json({ error: "Not found" }, { status: 404 });
				return json(updated);
			},
			DELETE: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}
				const [deleted] = await db
					.delete(shoppingListItem)
					.where(
						and(
							eq(shoppingListItem.id, params.id),
							eq(shoppingListItem.userId, session.user.id),
						),
					)
					.returning();
				if (!deleted) return json({ error: "Not found" }, { status: 404 });
				return json(deleted);
			},
		},
	},
});
