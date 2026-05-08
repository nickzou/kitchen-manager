import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession } from "#src/tests/helpers/factories";
import { makeGetRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	recipe: {},
}));

const mockWhere = vi.fn();

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockWhere,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/products/$id/source-recipes");

type Handler = (ctx: never) => Promise<Response>;
const { GET } = Route.options.server!.handlers! as Record<string, Handler>;
const params = { id: "product-1" };

describe("GET /api/products/:id/source-recipes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/products/product-1/source-recipes");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(401);
	});

	it("returns 200 with empty array when no source recipes", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/products/product-1/source-recipes");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with recipes that produce this product", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([
			{
				id: "recipe-1",
				name: "Chicken Stock",
				producedQuantity: "1000",
				producedQuantityUnitId: "unit-ml",
			},
		]);
		const request = makeGetRequest("/api/products/product-1/source-recipes");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(1);
		expect(data[0]).toMatchObject({
			id: "recipe-1",
			name: "Chicken Stock",
			producedQuantity: "1000",
			producedQuantityUnitId: "unit-ml",
		});
	});
});
