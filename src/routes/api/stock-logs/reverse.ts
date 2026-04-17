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

export const Route = createFileRoute("/api/stock-logs/reverse")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const { stockLogId, stockEntryId } = body;

				if (!stockLogId) {
					return json({ error: "stockLogId is required" }, { status: 400 });
				}

				const result = await db.transaction(async (tx) => {
					const [log] = await tx
						.select()
						.from(stockLog)
						.where(
							and(
								eq(stockLog.id, stockLogId),
								eq(stockLog.userId, session.user.id),
							),
						);

					if (!log) {
						return { error: "Stock log not found", status: 404 };
					}

					const logQty = Number(log.quantity);
					const entryId = log.stockEntryId ?? stockEntryId;

					if (
						log.transactionType === "consume" ||
						log.transactionType === "spoiled"
					) {
						if (!entryId) {
							return {
								error: "Cannot reverse: stock entry ID unknown",
								status: 400,
							};
						}

						const [existing] = await tx
							.select()
							.from(stockEntry)
							.where(eq(stockEntry.id, entryId));

						if (existing) {
							const newQty = (Number(existing.quantity) + logQty).toString();
							await tx
								.update(stockEntry)
								.set({ quantity: newQty })
								.where(eq(stockEntry.id, entryId));
						} else {
							await tx.insert(stockEntry).values({
								id: entryId,
								productId: log.productId,
								quantity: logQty.toString(),
								userId: session.user.id,
							});
						}
					} else if (log.transactionType === "add") {
						if (!entryId) {
							return {
								error: "Cannot reverse: stock entry ID unknown",
								status: 400,
							};
						}

						const [existing] = await tx
							.select()
							.from(stockEntry)
							.where(eq(stockEntry.id, entryId));

						if (existing) {
							const newQty = Number(existing.quantity) - logQty;
							if (newQty <= 0) {
								await tx.delete(stockEntry).where(eq(stockEntry.id, entryId));
							} else {
								await tx
									.update(stockEntry)
									.set({ quantity: newQty.toString() })
									.where(eq(stockEntry.id, entryId));
							}
						}
					} else if (log.transactionType === "remove") {
						if (!entryId) {
							return {
								error: "Cannot reverse: stock entry ID unknown",
								status: 400,
							};
						}

						const [existing] = await tx
							.select()
							.from(stockEntry)
							.where(eq(stockEntry.id, entryId));

						if (existing) {
							const newQty = (Number(existing.quantity) + logQty).toString();
							await tx
								.update(stockEntry)
								.set({ quantity: newQty })
								.where(eq(stockEntry.id, entryId));
						} else {
							await tx.insert(stockEntry).values({
								id: entryId,
								productId: log.productId,
								quantity: logQty.toString(),
								userId: session.user.id,
							});
						}
					}

					await tx.delete(stockLog).where(eq(stockLog.id, stockLogId));

					return { reversed: log, status: 200 };
				});

				if ("error" in result) {
					return json(
						{ error: result.error },
						{ status: result.status as number },
					);
				}

				dispatchWebhook(session.user.id, "stock.log.reversed", result.reversed);
				return json({ success: true, reversed: result.reversed });
			},
		},
	},
});
