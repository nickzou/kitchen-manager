import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { db } from "#src/db";
import { shoppingListItem } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/shopping-list-items/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}
				const items = await db
					.select()
					.from(shoppingListItem)
					.where(eq(shoppingListItem.userId, session.user.id))
					.orderBy(desc(shoppingListItem.createdAt));
				return json(items);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}
				const body = await request.json();
				if (!body.productId) {
					return json({ error: "productId is required" }, { status: 400 });
				}
				if (!body.quantity) {
					return json({ error: "quantity is required" }, { status: 400 });
				}
				const [created] = await db
					.insert(shoppingListItem)
					.values({
						productId: body.productId,
						quantity: String(body.quantity),
						quantityUnitId: body.quantityUnitId ?? null,
						userId: session.user.id,
					})
					.returning();
				return json(created, { status: 201 });
			},
		},
	},
});
