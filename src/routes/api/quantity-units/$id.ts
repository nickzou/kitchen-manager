import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { quantityUnit } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/quantity-units/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(quantityUnit)
					.where(
						and(
							eq(quantityUnit.id, params.id),
							eq(quantityUnit.userId, session.user.id),
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

				if (body.name !== undefined) updates.name = body.name;
				if (body.abbreviation !== undefined)
					updates.abbreviation = body.abbreviation;

				const [updated] = await db
					.update(quantityUnit)
					.set(updates)
					.where(
						and(
							eq(quantityUnit.id, params.id),
							eq(quantityUnit.userId, session.user.id),
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
					.delete(quantityUnit)
					.where(
						and(
							eq(quantityUnit.id, params.id),
							eq(quantityUnit.userId, session.user.id),
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
