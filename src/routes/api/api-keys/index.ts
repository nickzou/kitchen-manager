import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { apiKey } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

async function hashKey(raw: string): Promise<string> {
	const encoded = new TextEncoder().encode(raw);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function generateRawKey(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	const hex = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `km_${hex}`;
}

export const Route = createFileRoute("/api/api-keys/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const keys = await db
					.select({
						id: apiKey.id,
						name: apiKey.name,
						keyPrefix: apiKey.keyPrefix,
						lastUsedAt: apiKey.lastUsedAt,
						createdAt: apiKey.createdAt,
					})
					.from(apiKey)
					.where(eq(apiKey.userId, session.user.id));

				return json(keys);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				if (!body.name) {
					return json({ error: "Name is required" }, { status: 400 });
				}

				const rawKey = generateRawKey();
				const keyHash = await hashKey(rawKey);
				const keyPrefix = rawKey.slice(0, 11);

				const [created] = await db
					.insert(apiKey)
					.values({
						name: body.name,
						keyHash,
						keyPrefix,
						userId: session.user.id,
					})
					.returning({
						id: apiKey.id,
						name: apiKey.name,
						keyPrefix: apiKey.keyPrefix,
						createdAt: apiKey.createdAt,
					});

				return json({ ...created, key: rawKey }, { status: 201 });
			},
		},
	},
});
