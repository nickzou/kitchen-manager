import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { userSettings } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/user-settings/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [existing] = await db
					.select()
					.from(userSettings)
					.where(eq(userSettings.userId, session.user.id));

				if (existing) {
					return json(existing);
				}

				const [created] = await db
					.insert(userSettings)
					.values({ userId: session.user.id })
					.returning();

				return json(created);
			},
			PUT: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				const values: Record<string, unknown> = {};
				if ("advancedMode" in body)
					values.advancedMode = body.advancedMode ?? false;
				if ("apiEnabled" in body) values.apiEnabled = body.apiEnabled ?? false;
				if ("webhooksEnabled" in body)
					values.webhooksEnabled = body.webhooksEnabled ?? false;
				if ("nutritionEnabled" in body)
					values.nutritionEnabled = body.nutritionEnabled ?? false;

				const [updated] = await db
					.insert(userSettings)
					.values({
						userId: session.user.id,
						...values,
					})
					.onConflictDoUpdate({
						target: userSettings.userId,
						set: values,
					})
					.returning();

				return json(updated);
			},
		},
	},
});
