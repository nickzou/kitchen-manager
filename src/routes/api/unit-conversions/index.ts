import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { unitConversion } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/unit-conversions/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const conversions = await db
					.select()
					.from(unitConversion)
					.where(eq(unitConversion.userId, session.user.id));

				return json(conversions);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				const [created] = await db
					.insert(unitConversion)
					.values({
						fromUnitId: body.fromUnitId,
						toUnitId: body.toUnitId,
						factor: body.factor,
						userId: session.user.id,
					})
					.returning();

				return json(created, { status: 201 });
			},
		},
	},
});
