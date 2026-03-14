import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { productUnitConversion } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute(
	"/api/products/$id/unit-conversions/$conversionId",
)({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(productUnitConversion)
					.where(
						and(
							eq(productUnitConversion.id, params.conversionId),
							eq(productUnitConversion.userId, session.user.id),
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
					.update(productUnitConversion)
					.set(updates)
					.where(
						and(
							eq(productUnitConversion.id, params.conversionId),
							eq(productUnitConversion.userId, session.user.id),
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
					.delete(productUnitConversion)
					.where(
						and(
							eq(productUnitConversion.id, params.conversionId),
							eq(productUnitConversion.userId, session.user.id),
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
