import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { recipePrepStep } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/recipes/$id/prep-steps/$stepId")({
	server: {
		handlers: {
			PUT: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const updates: Record<string, unknown> = {};

				if (body.description !== undefined)
					updates.description = body.description;
				if (body.leadTimeMinutes !== undefined)
					updates.leadTimeMinutes = body.leadTimeMinutes;
				if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

				const [updated] = await db
					.update(recipePrepStep)
					.set(updates)
					.where(
						and(
							eq(recipePrepStep.id, params.stepId),
							eq(recipePrepStep.recipeId, params.id),
							eq(recipePrepStep.userId, session.user.id),
						),
					)
					.returning();

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
					.delete(recipePrepStep)
					.where(
						and(
							eq(recipePrepStep.id, params.stepId),
							eq(recipePrepStep.recipeId, params.id),
							eq(recipePrepStep.userId, session.user.id),
						),
					)
					.returning();

				if (!deleted) {
					return json({ error: "Not found" }, { status: 404 });
				}

				return json(deleted);
			},
		},
	},
});
