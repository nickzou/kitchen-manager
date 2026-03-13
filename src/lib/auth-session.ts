import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { user } from "#src/db/auth-schema";
import { apiKey } from "#src/db/schema";
import { auth } from "#src/lib/auth";

async function hashKey(raw: string): Promise<string> {
	const encoded = new TextEncoder().encode(raw);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function getAuthSession(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (session) return session;

	const authHeader = request.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;

	const token = authHeader.slice(7);
	if (!token) return null;

	const keyHash = await hashKey(token);
	const [found] = await db
		.select({ id: apiKey.id, userId: apiKey.userId })
		.from(apiKey)
		.where(eq(apiKey.keyHash, keyHash))
		.limit(1);

	if (!found) return null;

	await db
		.update(apiKey)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKey.id, found.id));

	const [foundUser] = await db
		.select()
		.from(user)
		.where(eq(user.id, found.userId))
		.limit(1);

	if (!foundUser) return null;

	return { user: foundUser, session: null };
}
