import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
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

function generateSecret(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	const hex = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `whsec_${hex}`;
}

export const Route = createFileRoute("/api/webhooks/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const endpoints = await db
					.select({
						id: webhookEndpoint.id,
						name: webhookEndpoint.name,
						url: webhookEndpoint.url,
						events: webhookEndpoint.events,
						status: webhookEndpoint.status,
						failCount: webhookEndpoint.failCount,
						createdAt: webhookEndpoint.createdAt,
					})
					.from(webhookEndpoint)
					.where(eq(webhookEndpoint.userId, session.user.id));

				return json(endpoints);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				if (!body.name || !body.url || !body.events) {
					return json(
						{ error: "name, url, and events are required" },
						{ status: 400 },
					);
				}

				if (
					!Array.isArray(body.events) ||
					body.events.length === 0 ||
					!body.events.every((e: string) =>
						(WEBHOOK_EVENTS as readonly string[]).includes(e),
					)
				) {
					return json({ error: "Invalid event names" }, { status: 400 });
				}

				try {
					new URL(body.url);
				} catch {
					return json({ error: "Invalid URL" }, { status: 400 });
				}

				const secret = generateSecret();

				const [created] = await db
					.insert(webhookEndpoint)
					.values({
						name: body.name,
						url: body.url,
						secret,
						events: body.events,
						userId: session.user.id,
					})
					.returning({
						id: webhookEndpoint.id,
						name: webhookEndpoint.name,
						url: webhookEndpoint.url,
						events: webhookEndpoint.events,
						status: webhookEndpoint.status,
						createdAt: webhookEndpoint.createdAt,
					});

				return json({ ...created, secret }, { status: 201 });
			},
		},
	},
});
