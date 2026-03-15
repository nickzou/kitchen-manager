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

export const Route = createFileRoute("/api/recipes/$id/prep-steps/")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const steps = await db
					.select()
					.from(recipePrepStep)
					.where(
						and(
							eq(recipePrepStep.recipeId, params.id),
							eq(recipePrepStep.userId, session.user.id),
						),
					);

				return json(steps);
			},
			POST: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				if (!body.description) {
					return json({ error: "Description is required" }, { status: 400 });
				}

				if (body.leadTimeMinutes == null) {
					return json({ error: "Lead time is required" }, { status: 400 });
				}

				const [created] = await db
					.insert(recipePrepStep)
					.values({
						recipeId: params.id,
						description: body.description,
						leadTimeMinutes: body.leadTimeMinutes,
						sortOrder: body.sortOrder,
						userId: session.user.id,
					})
					.returning();

				return json(created, { status: 201 });
			},
		},
	},
});
