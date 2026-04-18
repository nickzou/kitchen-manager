import { createFileRoute } from "@tanstack/react-router";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "#src/db";
import { stockLog } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/stock-logs/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const url = new URL(request.url);
				const productId = url.searchParams.get("productId");
				const limit = Math.max(
					1,
					Math.min(100, Number(url.searchParams.get("limit")) || 20),
				);
				const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

				const conditions = [eq(stockLog.userId, session.user.id)];
				if (productId) {
					conditions.push(eq(stockLog.productId, productId));
				}

				const where = and(...conditions);

				const [logs, [{ total }]] = await Promise.all([
					db
						.select()
						.from(stockLog)
						.where(where)
						.orderBy(desc(stockLog.createdAt))
						.limit(limit)
						.offset(offset),
					db.select({ total: count() }).from(stockLog).where(where),
				]);

				return json({ logs, total });
			},
		},
	},
});
