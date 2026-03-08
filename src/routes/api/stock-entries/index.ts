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

export const Route = createFileRoute("/api/stock-entries/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const url = new URL(request.url);
				const productId = url.searchParams.get("productId");

				const conditions = [eq(stockEntry.userId, session.user.id)];
				if (productId) {
					conditions.push(eq(stockEntry.productId, productId));
				}

				const entries = await db
					.select()
					.from(stockEntry)
					.where(and(...conditions));

				return json(entries);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				const result = await db.transaction(async (tx) => {
					const [created] = await tx
						.insert(stockEntry)
						.values({
							productId: body.productId,
							quantity: body.quantity,
							expirationDate: body.expirationDate
								? new Date(body.expirationDate)
								: null,
							purchaseDate: body.purchaseDate
								? new Date(body.purchaseDate)
								: null,
							price: body.price ?? null,
							userId: session.user.id,
						})
						.returning();

					await tx.insert(stockLog).values({
						stockEntryId: created.id,
						productId: created.productId,
						transactionType: "add",
						quantity: created.quantity,
						userId: session.user.id,
					});

					return created;
				});

				return json(result, { status: 201 });
			},
		},
	},
});
