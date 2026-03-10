import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { unitConversion } from "#/db/schema";
import { getAuthSession } from "#/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/unit-conversions/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(unitConversion)
					.where(
						and(
							eq(unitConversion.id, params.id),
							eq(unitConversion.userId, session.user.id),
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

				if (body.fromUnitId !== undefined) updates.fromUnitId = body.fromUnitId;
				if (body.toUnitId !== undefined) updates.toUnitId = body.toUnitId;
				if (body.factor !== undefined) updates.factor = body.factor;

				const [updated] = await db
					.update(unitConversion)
					.set(updates)
					.where(
						and(
							eq(unitConversion.id, params.id),
							eq(unitConversion.userId, session.user.id),
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
					.delete(unitConversion)
					.where(
						and(
							eq(unitConversion.id, params.id),
							eq(unitConversion.userId, session.user.id),
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
