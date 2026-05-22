import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { recipeCategoryType } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import { isUniqueViolation } from "#src/lib/unique-violation";

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

				let created: typeof recipeCategoryType.$inferSelect;
				try {
					[created] = await db
						.insert(recipeCategoryType)
						.values({
							name: body.name,
							description: body.description,
							userId: session.user.id,
						})
						.returning();
				} catch (err) {
					if (isUniqueViolation(err)) {
						return json(
							{ error: "A recipe category with this name already exists" },
							{ status: 409 },
						);
					}
					throw err;
				}

				return json(created, { status: 201 });
			},
		},
	},
});
