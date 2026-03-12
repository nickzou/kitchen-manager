import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { mealSlot } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/meal-slots/reorder")({
	server: {
		handlers: {
			PUT: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const { orderedIds } = body;

				if (!Array.isArray(orderedIds)) {
					return json(
						{ error: "orderedIds array is required" },
						{ status: 400 },
					);
				}

				await db.transaction(async (tx) => {
					for (let i = 0; i < orderedIds.length; i++) {
						await tx
							.update(mealSlot)
							.set({ sortOrder: i })
							.where(
								and(
									eq(mealSlot.id, orderedIds[i]),
									eq(mealSlot.userId, session.user.id),
								),
							);
					}
				});

				return json({ success: true });
			},
		},
	},
});
