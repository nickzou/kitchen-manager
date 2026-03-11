import { createFileRoute } from "@tanstack/react-router";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "#src/db";
import { mealPlanEntry, recipe } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/meal-plan-entries/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const url = new URL(request.url);
				const startDate = url.searchParams.get("startDate");
				const endDate = url.searchParams.get("endDate");

				if (!startDate || !endDate) {
					return json(
						{ error: "startDate and endDate are required" },
						{ status: 400 },
					);
				}

				const entries = await db
					.select({
						id: mealPlanEntry.id,
						date: mealPlanEntry.date,
						mealSlotId: mealPlanEntry.mealSlotId,
						recipeId: mealPlanEntry.recipeId,
						servings: mealPlanEntry.servings,
						sortOrder: mealPlanEntry.sortOrder,
						userId: mealPlanEntry.userId,
						createdAt: mealPlanEntry.createdAt,
						updatedAt: mealPlanEntry.updatedAt,
						recipeName: recipe.name,
						recipeImage: recipe.image,
						recipeServings: recipe.servings,
					})
					.from(mealPlanEntry)
					.leftJoin(recipe, eq(mealPlanEntry.recipeId, recipe.id))
					.where(
						and(
							eq(mealPlanEntry.userId, session.user.id),
							gte(mealPlanEntry.date, new Date(startDate)),
							lte(mealPlanEntry.date, new Date(endDate)),
						),
					);

				return json(entries);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				if (!body.date || !body.mealSlotId || !body.recipeId) {
					return json(
						{ error: "date, mealSlotId, and recipeId are required" },
						{ status: 400 },
					);
				}

				const [created] = await db
					.insert(mealPlanEntry)
					.values({
						date: new Date(body.date),
						mealSlotId: body.mealSlotId,
						recipeId: body.recipeId,
						servings: body.servings ?? null,
						sortOrder: body.sortOrder ?? 0,
						userId: session.user.id,
					})
					.returning();

				return json(created, { status: 201 });
			},
		},
	},
});
