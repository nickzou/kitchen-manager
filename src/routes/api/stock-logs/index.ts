import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
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

				const conditions = [eq(stockLog.userId, session.user.id)];
				if (productId) {
					conditions.push(eq(stockLog.productId, productId));
				}

				const logs = await db
					.select()
					.from(stockLog)
					.where(and(...conditions));

				return json(logs);
			},
		},
	},
});
