import { createFileRoute } from "@tanstack/react-router";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "#src/db";
import { product, productCategory } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/products/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const products = await db
					.select()
					.from(product)
					.where(eq(product.userId, session.user.id))
					.orderBy(asc(product.name));

				if (products.length === 0) return json([]);

				const productIds = products.map((p) => p.id);
				const categoryRows = await db
					.select()
					.from(productCategory)
					.where(inArray(productCategory.productId, productIds));

				const categoryMap = new Map<string, string[]>();
				for (const row of categoryRows) {
					const list = categoryMap.get(row.productId) ?? [];
					list.push(row.categoryId);
					categoryMap.set(row.productId, list);
				}

				const result = products.map((p) => ({
					...p,
					categoryIds: categoryMap.get(p.id) ?? [],
				}));

				return json(result);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				let created: typeof product.$inferSelect;
				try {
					[created] = await db
						.insert(product)
						.values({
							name: body.name,
							description: body.description,
							image: body.image,
							defaultQuantityUnitId: body.defaultQuantityUnitId ?? null,
							minStockAmount: body.minStockAmount ?? "0",
							defaultExpirationDays: body.defaultExpirationDays ?? null,
							defaultConsumeAmount: body.defaultConsumeAmount ?? null,
							defaultConsumeUnitId: body.defaultConsumeUnitId ?? null,
							calories: body.calories ?? null,
							protein: body.protein ?? null,
							fat: body.fat ?? null,
							carbs: body.carbs ?? null,
							defaultTareWeight: body.defaultTareWeight ?? null,
							userId: session.user.id,
						})
						.returning();
				} catch (err: unknown) {
					if (
						err instanceof Error &&
						"code" in err &&
						(err as { code: string }).code === "23505"
					) {
						return json(
							{ error: "A product with this name already exists" },
							{ status: 409 },
						);
					}
					throw err;
				}

				const categoryIds: string[] = body.categoryIds ?? [];
				if (categoryIds.length > 0) {
					await db.insert(productCategory).values(
						categoryIds.map((categoryId: string) => ({
							productId: created.id,
							categoryId,
						})),
					);
				}

				return json({ ...created, categoryIds }, { status: 201 });
			},
		},
	},
});
