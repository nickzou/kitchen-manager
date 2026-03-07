import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#/db";
import { product } from "#/db/schema";
import { getAuthSession } from "#/lib/auth-session";

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
						category: body.category,
						description: body.description,
						image: body.image,
						expirationDate: body.expirationDate
							? new Date(body.expirationDate)
							: null,
						userId: session.user.id,
					})
					.returning();

				return json(created, { status: 201 });
			},
		},
	},
});
