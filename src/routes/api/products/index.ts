import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#src/db";
import { product } from "#src/db/schema";
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
					.where(eq(product.userId, session.user.id));

				return json(products);
			},
			POST: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = await request.json();

				const [created] = await db
					.insert(product)
					.values({
						name: body.name,
						description: body.description,
						image: body.image,
						categoryId: body.categoryId ?? null,
						quantityUnitId: body.quantityUnitId ?? null,
						minStockAmount: body.minStockAmount ?? "0",
						defaultExpirationDays: body.defaultExpirationDays ?? null,
						userId: session.user.id,
					})
					.returning();

				return json(created, { status: 201 });
			},
		},
	},
});
