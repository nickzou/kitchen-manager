import { createFileRoute } from "@tanstack/react-router";
import { asc, eq } from "drizzle-orm";
import { db } from "#src/db";
import { mealSlot } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

const DEFAULT_SLOTS = [
	{ name: "Breakfast", sortOrder: 0 },
	{ name: "Lunch", sortOrder: 1 },
	{ name: "Dinner", sortOrder: 2 },
];

export const Route = createFileRoute("/api/meal-slots/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				let slots = await db
					.select()
					.from(mealSlot)
					.where(eq(mealSlot.userId, session.user.id))
					.orderBy(asc(mealSlot.sortOrder), asc(mealSlot.name));

				if (slots.length === 0) {
					await db.insert(mealSlot).values(
						DEFAULT_SLOTS.map((s) => ({
							name: s.name,
							sortOrder: s.sortOrder,
							userId: session.user.id,
						})),
					);
					slots = await db
						.select()
						.from(mealSlot)
						.where(eq(mealSlot.userId, session.user.id))
						.orderBy(asc(mealSlot.sortOrder), asc(mealSlot.name));
				}

				return json(slots);
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

				const [created] = await db
					.insert(mealSlot)
					.values({
						name: body.name,
						sortOrder: body.sortOrder ?? 0,
						userId: session.user.id,
					})
					.returning();

				return json(created, { status: 201 });
			},
		},
	},
});
