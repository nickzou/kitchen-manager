import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { stockEntry, stockLog } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import { dispatchWebhook } from "#src/lib/webhooks";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/stock-entries/spoil")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const { stockEntryId, quantity } = body;

				if (!stockEntryId || !quantity) {
					return json(
						{ error: "stockEntryId and quantity are required" },
						{ status: 400 },
					);
				}

				const spoilQty = Number(quantity);
				if (spoilQty <= 0) {
					return json({ error: "Quantity must be positive" }, { status: 400 });
				}

				const result = await db.transaction(async (tx) => {
					const [entry] = await tx
						.select()
						.from(stockEntry)
						.where(
							and(
								eq(stockEntry.id, stockEntryId),
								eq(stockEntry.userId, session.user.id),
							),
						);

					if (!entry) {
						return { error: "Not found", status: 404 };
					}

					const available = Number(entry.quantity);
					if (spoilQty > available) {
						return {
							error: `Cannot spoil ${spoilQty}, only ${available} available`,
							status: 400,
						};
					}

					const newQuantity = (available - spoilQty).toString();

					await tx.insert(stockLog).values({
						stockEntryId: entry.id,
						productId: entry.productId,
						transactionType: "spoiled",
						quantity: quantity.toString(),
						userId: session.user.id,
					});

					if (newQuantity === "0") {
						const [deleted] = await tx
							.delete(stockEntry)
							.where(eq(stockEntry.id, stockEntryId))
							.returning();
						return { entry: { ...deleted, quantity: "0" }, status: 200 };
					}

					const [updated] = await tx
						.update(stockEntry)
						.set({ quantity: newQuantity })
						.where(eq(stockEntry.id, stockEntryId))
						.returning();

					return { entry: updated, status: 200 };
				});

				if ("error" in result) {
					return json(
						{ error: result.error },
						{ status: result.status as number },
					);
				}

				dispatchWebhook(session.user.id, "stock.entry.spoiled", result.entry);
				return json(result.entry);
			},
		},
	},
});
