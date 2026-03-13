import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { apiKey } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/api-keys/$id")({
	server: {
		handlers: {
			DELETE: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [deleted] = await db
					.delete(apiKey)
					.where(
						and(eq(apiKey.id, params.id), eq(apiKey.userId, session.user.id)),
					)
					.returning();

				if (!deleted) {
					return json({ error: "Not found" }, { status: 404 });
				}

				return json({ success: true });
			},
		},
	},
});
