import { createFileRoute } from "@tanstack/react-router";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "#src/db";
import { productUnitConversion } from "#src/db/schema";
import { getAuthSession } from "#src/lib/auth-session";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status ?? 200,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/product-unit-conversions/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await getAuthSession(request);
				if (!session) {
					return json({ error: "Unauthorized" }, { status: 401 });
				}

				const url = new URL(request.url);
				const productIdsParam = url.searchParams.get("productIds");
				if (!productIdsParam) {
					return json(
						{ error: "productIds query parameter is required" },
						{ status: 400 },
					);
				}

				const productIds = productIdsParam
					.split(",")
					.filter((id) => id.length > 0);
				if (productIds.length === 0) {
					return json(
						{ error: "productIds query parameter is required" },
						{ status: 400 },
					);
				}

				const conversions = await db
					.select()
					.from(productUnitConversion)
					.where(
						and(
							eq(productUnitConversion.userId, session.user.id),
							inArray(productUnitConversion.productId, productIds),
						),
					);

				return json(conversions);
			},
		},
	},
});
