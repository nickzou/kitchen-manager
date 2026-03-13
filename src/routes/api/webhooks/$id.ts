import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { webhookEndpoint } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import { WEBHOOK_EVENTS } from "#src/lib/webhooks";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/webhooks/$id")({
	server: {
		handlers: {
			PUT: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const updates: Record<string, unknown> = {};

				if (body.name !== undefined) updates.name = body.name;
				if (body.url !== undefined) {
					try {
						new URL(body.url);
					} catch {
						return json({ error: "Invalid URL" }, { status: 400 });
					}
					updates.url = body.url;
				}
				if (body.events !== undefined) {
					if (
						!Array.isArray(body.events) ||
						body.events.length === 0 ||
						!body.events.every((e: string) =>
							(WEBHOOK_EVENTS as readonly string[]).includes(e),
						)
					) {
						return json({ error: "Invalid event names" }, { status: 400 });
					}
					updates.events = body.events;
				}
				if (body.status === "active") {
					updates.status = "active";
					updates.failCount = 0;
				}

				const [updated] = await db
					.update(webhookEndpoint)
					.set(updates)
					.where(
						and(
							eq(webhookEndpoint.id, params.id),
							eq(webhookEndpoint.userId, session.user.id),
						),
					)
					.returning({
						id: webhookEndpoint.id,
						name: webhookEndpoint.name,
						url: webhookEndpoint.url,
						events: webhookEndpoint.events,
						status: webhookEndpoint.status,
						failCount: webhookEndpoint.failCount,
						createdAt: webhookEndpoint.createdAt,
					});

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
					.delete(webhookEndpoint)
					.where(
						and(
							eq(webhookEndpoint.id, params.id),
							eq(webhookEndpoint.userId, session.user.id),
						),
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
