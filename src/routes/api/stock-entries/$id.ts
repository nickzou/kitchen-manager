import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { stockEntry, stockLog } from "#/db/schema";
import { getAuthSession } from "#/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/stock-entries/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(stockEntry)
					.where(
						and(
							eq(stockEntry.id, params.id),
							eq(stockEntry.userId, session.user.id),
						),
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

				if (body.quantity !== undefined) updates.quantity = body.quantity;
				if (body.expirationDate !== undefined)
					updates.expirationDate = body.expirationDate
						? new Date(body.expirationDate)
						: null;
				if (body.purchaseDate !== undefined)
					updates.purchaseDate = body.purchaseDate
						? new Date(body.purchaseDate)
						: null;
				if (body.price !== undefined) updates.price = body.price;

				const [updated] = await db
					.update(stockEntry)
					.set(updates)
					.where(
						and(
							eq(stockEntry.id, params.id),
							eq(stockEntry.userId, session.user.id),
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

				const result = await db.transaction(async (tx) => {
					const [found] = await tx
						.select()
						.from(stockEntry)
						.where(
							and(
								eq(stockEntry.id, params.id),
								eq(stockEntry.userId, session.user.id),
							),
						);

					if (!found) {
						return null;
					}

					if (Number(found.quantity) > 0) {
						await tx.insert(stockLog).values({
							stockEntryId: null,
							productId: found.productId,
							transactionType: "remove",
							quantity: found.quantity,
							userId: session.user.id,
						});
					}

					const [deleted] = await tx
						.delete(stockEntry)
						.where(eq(stockEntry.id, params.id))
						.returning();

					return deleted;
				});

				if (!result) {
					return json({ error: "Not found" }, { status: 404 });
				}

				return json(result);
			},
		},
	},
});
