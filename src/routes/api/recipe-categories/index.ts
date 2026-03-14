import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { recipeCategoryType } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/recipe-categories/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const categories = await db
					.select()
					.from(recipeCategoryType)
					.where(eq(recipeCategoryType.userId, session.user.id));

				return json(categories);
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

				const [created] = await db
					.insert(recipeCategoryType)
					.values({
						name: body.name,
						description: body.description,
						userId: session.user.id,
					})
					.returning();

				return json(created, { status: 201 });
			},
		},
	},
});
