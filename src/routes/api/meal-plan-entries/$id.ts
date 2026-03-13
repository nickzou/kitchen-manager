import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { mealPlanEntry } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import { dispatchWebhook } from "#src/lib/webhooks";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/meal-plan-entries/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(mealPlanEntry)
					.where(
						and(
							eq(mealPlanEntry.id, params.id),
							eq(mealPlanEntry.userId, session.user.id),
						),
					);

				if (!found) {
					return json({ error: "Not found" }, { status: 404 });
				}

				return json(found);
			},
			PUT: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const updates: Record<string, unknown> = {};

				if (body.date !== undefined) updates.date = body.date;
				if (body.mealSlotId !== undefined) updates.mealSlotId = body.mealSlotId;
				if (body.recipeId !== undefined) updates.recipeId = body.recipeId;
				if (body.servings !== undefined) updates.servings = body.servings;
				if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

				const [updated] = await db
					.update(mealPlanEntry)
					.set(updates)
					.where(
						and(
							eq(mealPlanEntry.id, params.id),
							eq(mealPlanEntry.userId, session.user.id),
						),
					)
					.returning();

				if (!updated) {
					return json({ error: "Not found" }, { status: 404 });
				}

				dispatchWebhook(session.user.id, "meal_plan.entry.updated", updated);
				return json(updated);
			},
			DELETE: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [deleted] = await db
					.delete(mealPlanEntry)
					.where(
						and(
							eq(mealPlanEntry.id, params.id),
							eq(mealPlanEntry.userId, session.user.id),
						),
					)
					.returning();

				if (!deleted) {
					return json({ error: "Not found" }, { status: 404 });
				}

				dispatchWebhook(session.user.id, "meal_plan.entry.deleted", deleted);
				return json(deleted);
			},
		},
	},
});
