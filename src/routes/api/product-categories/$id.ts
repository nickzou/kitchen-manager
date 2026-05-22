import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "#src/db";
import { productCategoryType } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";
import { isUniqueViolation } from "#src/lib/unique-violation";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/product-categories/$id")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const [found] = await db
					.select()
					.from(productCategoryType)
					.where(
						and(
							eq(productCategoryType.id, params.id),
							eq(productCategoryType.userId, session.user.id),
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
				if (body.description !== undefined)
					updates.description = body.description;
				if (body.minStockAmount !== undefined)
					updates.minStockAmount = body.minStockAmount;
				if (body.minStockUnitId !== undefined)
					updates.minStockUnitId = body.minStockUnitId;

				let updated: typeof productCategoryType.$inferSelect | undefined;
				try {
					[updated] = await db
						.update(productCategoryType)
						.set(updates)
						.where(
							and(
								eq(productCategoryType.id, params.id),
								eq(productCategoryType.userId, session.user.id),
							),
						)
						.returning();
				} catch (err) {
					if (isUniqueViolation(err)) {
						return json(
							{ error: "A product category with this name already exists" },
							{ status: 409 },
						);
					}
					throw err;
				}

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
					.delete(productCategoryType)
					.where(
						and(
							eq(productCategoryType.id, params.id),
							eq(productCategoryType.userId, session.user.id),
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
