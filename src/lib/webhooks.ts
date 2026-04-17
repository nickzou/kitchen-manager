import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "#src/db";
import { webhookDelivery, webhookEndpoint } from "#src/db/schema";

export const WEBHOOK_EVENTS = [
	"stock.entry.created",
	"stock.entry.updated",
	"stock.entry.deleted",
	"stock.entry.consumed",
	"stock.entry.spoiled",
	"stock.log.reversed",
	"meal_plan.entry.created",
	"meal_plan.entry.updated",
	"meal_plan.entry.deleted",
	"meal_plan.entry.cooked",
	"meal_plan.entry.uncooked",
	"meal_slot.created",
	"meal_slot.updated",
	"meal_slot.deleted",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const BACKOFF_MINUTES: Record<number, number> = {
	2: 5,
	3: 25,
};

const MAX_ATTEMPTS = 3;
const SUSPEND_THRESHOLD = 10;

async function signPayload(secret: string, body: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function deliverWebhook(
	endpoint: { id: string; url: string; secret: string },
	_delivery: { id: string; attempt: number },
	payload: string,
): Promise<{ success: boolean; statusCode?: number }> {
	try {
		const signature = await signPayload(endpoint.secret, payload);
		const response = await fetch(endpoint.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Webhook-Signature": signature,
			},
			body: payload,
			signal: AbortSignal.timeout(10_000),
		});
		return { success: response.ok, statusCode: response.status };
	} catch {
		return { success: false };
	}
}

export function dispatchWebhook(
	userId: string,
	event: WebhookEvent,
	data: unknown,
): void {
	(async () => {
		try {
			const endpoints = await db
				.select()
				.from(webhookEndpoint)
				.where(
					and(
						eq(webhookEndpoint.userId, userId),
						eq(webhookEndpoint.status, "active"),
						sql`${webhookEndpoint.events} @> ARRAY[${event}]::text[]`,
					),
				);

			const payload = JSON.stringify({
				event,
				data,
				timestamp: new Date().toISOString(),
			});

			for (const endpoint of endpoints) {
				const [delivery] = await db
					.insert(webhookDelivery)
					.values({
						webhookEndpointId: endpoint.id,
						event,
						payload,
						status: "pending",
						attempt: 1,
						userId,
					})
					.returning();

				const result = await deliverWebhook(endpoint, delivery, payload);

				if (result.success) {
					await db
						.update(webhookDelivery)
						.set({ status: "success", statusCode: result.statusCode })
						.where(eq(webhookDelivery.id, delivery.id));

					if (endpoint.failCount > 0) {
						await db
							.update(webhookEndpoint)
							.set({ failCount: 0 })
							.where(eq(webhookEndpoint.id, endpoint.id));
					}
				} else {
					await db
						.update(webhookDelivery)
						.set({
							status: "failed",
							statusCode: result.statusCode ?? null,
							nextRetryAt: new Date(Date.now() + 60_000),
						})
						.where(eq(webhookDelivery.id, delivery.id));
				}
			}
		} catch {
			// Non-blocking — swallow errors to avoid disrupting the caller
		}
	})();
}

export async function processWebhookRetries(): Promise<{
	processed: number;
	succeeded: number;
	failed: number;
	suspended: number;
}> {
	const stats = { processed: 0, succeeded: 0, failed: 0, suspended: 0 };

	const deliveries = await db
		.select({
			delivery: webhookDelivery,
			endpoint: webhookEndpoint,
		})
		.from(webhookDelivery)
		.innerJoin(
			webhookEndpoint,
			eq(webhookDelivery.webhookEndpointId, webhookEndpoint.id),
		)
		.where(
			and(
				eq(webhookDelivery.status, "failed"),
				lte(webhookDelivery.nextRetryAt, new Date()),
				sql`${webhookDelivery.attempt} < ${MAX_ATTEMPTS}`,
				eq(webhookEndpoint.status, "active"),
			),
		);

	for (const { delivery, endpoint } of deliveries) {
		stats.processed++;
		const nextAttempt = delivery.attempt + 1;

		const result = await deliverWebhook(
			endpoint,
			{ id: delivery.id, attempt: nextAttempt },
			delivery.payload,
		);

		if (result.success) {
			stats.succeeded++;
			await db
				.update(webhookDelivery)
				.set({
					status: "success",
					statusCode: result.statusCode,
					attempt: nextAttempt,
					nextRetryAt: null,
				})
				.where(eq(webhookDelivery.id, delivery.id));

			if (endpoint.failCount > 0) {
				await db
					.update(webhookEndpoint)
					.set({ failCount: 0 })
					.where(eq(webhookEndpoint.id, endpoint.id));
			}
		} else {
			await db
				.update(webhookDelivery)
				.set({
					attempt: nextAttempt,
					statusCode: result.statusCode ?? null,
					...(nextAttempt >= MAX_ATTEMPTS
						? { nextRetryAt: null }
						: {
								nextRetryAt: new Date(
									Date.now() + (BACKOFF_MINUTES[nextAttempt] ?? 5) * 60_000,
								),
							}),
				})
				.where(eq(webhookDelivery.id, delivery.id));

			if (nextAttempt >= MAX_ATTEMPTS) {
				stats.failed++;
				const newFailCount = endpoint.failCount + 1;

				if (newFailCount >= SUSPEND_THRESHOLD) {
					stats.suspended++;
					await db
						.update(webhookEndpoint)
						.set({ failCount: newFailCount, status: "suspended" })
						.where(eq(webhookEndpoint.id, endpoint.id));
				} else {
					await db
						.update(webhookEndpoint)
						.set({ failCount: newFailCount })
						.where(eq(webhookEndpoint.id, endpoint.id));
				}
			}
		}
	}

	return stats;
}
