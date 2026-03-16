import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { product, productCategory } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/products/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(product)
					.where(
						and(eq(product.id, params.id), eq(product.userId, session.user.id)),
					);

				if (!found) {
					return json({ error: "Not found" }, { status: 404 });
				}

				const categoryRows = await db
					.select()
					.from(productCategory)
					.where(eq(productCategory.productId, found.id));

				return json({
					...found,
					categoryIds: categoryRows.map((r) => r.categoryId),
				});
			},
			PUT: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();
				const updates: Record<string, unknown> = {};

				if (body.name !== undefined) updates.name = body.name;
				if (body.description !== undefined)
					updates.description = body.description;
				if (body.image !== undefined) updates.image = body.image;
				if (body.defaultQuantityUnitId !== undefined)
					updates.defaultQuantityUnitId = body.defaultQuantityUnitId;
				if (body.minStockAmount !== undefined)
					updates.minStockAmount = body.minStockAmount;
				if (body.defaultExpirationDays !== undefined)
					updates.defaultExpirationDays = body.defaultExpirationDays;
				if (body.defaultConsumeAmount !== undefined)
					updates.defaultConsumeAmount = body.defaultConsumeAmount;

				let updated: typeof product.$inferSelect | undefined;
				try {
					[updated] = await db
						.update(product)
						.set(updates)
						.where(
							and(
								eq(product.id, params.id),
								eq(product.userId, session.user.id),
							),
						)
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

				if (!updated) {
					return json({ error: "Not found" }, { status: 404 });
				}

				if (body.categoryIds !== undefined) {
					await db
						.delete(productCategory)
						.where(eq(productCategory.productId, updated.id));
					const categoryIds: string[] = body.categoryIds;
					if (categoryIds.length > 0) {
						await db.insert(productCategory).values(
							categoryIds.map((categoryId: string) => ({
								productId: updated.id,
								categoryId,
							})),
						);
					}
				}

				const categoryRows = await db
					.select()
					.from(productCategory)
					.where(eq(productCategory.productId, updated.id));

				return json({
					...updated,
					categoryIds: categoryRows.map((r) => r.categoryId),
				});
			},
			DELETE: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [deleted] = await db
					.delete(product)
					.where(
						and(eq(product.id, params.id), eq(product.userId, session.user.id)),
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
