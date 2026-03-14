import { createFileRoute } from "@tanstack/react-router";
import { eq, inArray } from "drizzle-orm";
import { db } from "#src/db";
import { recipe, recipeCategory } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/recipes/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const recipes = await db
					.select()
					.from(recipe)
					.where(eq(recipe.userId, session.user.id));

				if (recipes.length === 0) return json([]);

				const recipeIds = recipes.map((r) => r.id);
				const categoryRows = await db
					.select()
					.from(recipeCategory)
					.where(inArray(recipeCategory.recipeId, recipeIds));

				const categoryMap = new Map<string, string[]>();
				for (const row of categoryRows) {
					const list = categoryMap.get(row.recipeId) ?? [];
					list.push(row.categoryId);
					categoryMap.set(row.recipeId, list);
				}

				const result = recipes.map((r) => ({
					...r,
					categoryIds: categoryMap.get(r.id) ?? [],
				}));

				return json(result);
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
					.insert(recipe)
					.values({
						name: body.name,
						description: body.description,
						image: body.image,
						servings: body.servings,
						prepTime: body.prepTime,
						cookTime: body.cookTime,
						instructions: body.instructions,
						producedProductId: body.producedProductId,
						producedQuantity: body.producedQuantity,
						producedQuantityUnitId: body.producedQuantityUnitId,
						userId: session.user.id,
					})
					.returning();

				const categoryIds: string[] = body.categoryIds ?? [];
				if (categoryIds.length > 0) {
					await db.insert(recipeCategory).values(
						categoryIds.map((categoryId: string) => ({
							recipeId: created.id,
							categoryId,
						})),
					);
				}

				return json({ ...created, categoryIds }, { status: 201 });
			},
		},
	},
});
