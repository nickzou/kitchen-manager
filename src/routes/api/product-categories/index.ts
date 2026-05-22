import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
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

export const Route = createFileRoute("/api/product-categories/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const categories = await db
					.select()
					.from(productCategoryType)
					.where(eq(productCategoryType.userId, session.user.id));

				return json(categories);
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

				let created: typeof productCategoryType.$inferSelect;
				try {
					[created] = await db
						.insert(productCategoryType)
						.values({
							name: body.name,
							description: body.description,
							minStockAmount: body.minStockAmount ?? "0",
							minStockUnitId: body.minStockUnitId ?? null,
							userId: session.user.id,
						})
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

				return json(created, { status: 201 });
			},
		},
	},
});
