import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { quantityUnit } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import { isUniqueViolation } from "#src/lib/unique-violation";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/quantity-units/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const units = await db
					.select()
					.from(quantityUnit)
					.where(eq(quantityUnit.userId, session.user.id));

				return json(units);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				let created: typeof quantityUnit.$inferSelect;
				try {
					[created] = await db
						.insert(quantityUnit)
						.values({
							name: body.name,
							abbreviation: body.abbreviation ?? null,
							userId: session.user.id,
						})
						.returning();
				} catch (err) {
					if (isUniqueViolation(err)) {
						return json(
							{ error: "A quantity unit with this name already exists" },
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
