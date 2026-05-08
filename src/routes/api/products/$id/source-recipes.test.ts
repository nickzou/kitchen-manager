import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession } from "#src/tests/helpers/factories";
import { makeGetRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	product: {},
	productUnitConversion: {},
	recipe: {},
	recipeIngredient: {},
	unitConversion: {},
}));

// Handler runs these select() calls in order:
// 0. recipes producing the product
// (only when recipes.length > 0)
// 1. recipe ingredients
// (only when ingredientProductIds.length > 0; Promise.all order:)
// 2. ingredient products (nutrition fields)
// 3. global unit conversions
// 4. product unit conversions
let selectCall = 0;
const mockResults: unknown[] = [];

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => {
			const idx = selectCall++;
			return {
				from: vi.fn(() => ({
					where: vi.fn(() => Promise.resolve(mockResults[idx] ?? [])),
				})),
			};
		}),
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
		selectCall = 0;
		mockResults.length = 0;
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/products/product-1/source-recipes");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(401);
	});

	it("returns 200 with empty array when no source recipes", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = []; // recipes
		const request = makeGetRequest("/api/products/product-1/source-recipes");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns recipes with derivedNutrition computed from their ingredients", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			{
				id: "recipe-stock",
				name: "Chicken Stock",
				producedQuantity: "1000",
				producedQuantityUnitId: "unit-ml",
			},
		];
		mockResults[1] = [
			{
				recipeId: "recipe-stock",
				productId: "p-chicken",
				quantity: "200",
				quantityUnitId: "unit-g",
			},
		];
		mockResults[2] = [
			{
				id: "p-chicken",
				defaultQuantityUnitId: "unit-g",
				nutritionBaseAmount: "100",
				nutritionBaseUnitId: "unit-g",
				calories: "165",
				protein: "31",
				fat: "3.6",
				carbs: "0",
			},
		];
		mockResults[3] = []; // global conversions
		mockResults[4] = []; // product conversions

		const request = makeGetRequest("/api/products/product-1/source-recipes");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(1);
		expect(data[0]).toMatchObject({
			id: "recipe-stock",
			name: "Chicken Stock",
			producedQuantity: "1000",
			producedQuantityUnitId: "unit-ml",
		});
		expect(data[0].derivedNutrition).toMatchObject({
			calories: 330,
			protein: 62,
			baseAmount: 1000,
			baseUnitId: "unit-ml",
			complete: true,
		});
	});

	it("returns null derivedNutrition when produced quantity/unit missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			{
				id: "recipe-no-yield",
				name: "Mystery Sauce",
				producedQuantity: null,
				producedQuantityUnitId: null,
			},
		];
		mockResults[1] = [];

		const request = makeGetRequest("/api/products/product-1/source-recipes");
		const response = await GET({ request, params } as never);
		const data = await response.json();
		expect(data[0].derivedNutrition).toBeNull();
	});
});
