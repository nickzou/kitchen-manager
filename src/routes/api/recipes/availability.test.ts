import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession } from "#src/tests/helpers/factories";
import { makeGetRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	product: {},
	productUnitConversion: {},
	recipeIngredient: {},
	stockEntry: {},
	unitConversion: {},
}));

// Handler runs these select() calls in order:
// 0. recipe ingredients for user
// 1. products (default unit info)
// 2. stock totals per product (ends with .groupBy)
// 3. global unit conversions
// 4. product-specific unit conversions
let selectCall = 0;
const mockResults: unknown[] = [];

function awaitable(result: unknown) {
	const p = Promise.resolve(result) as Promise<unknown> & {
		groupBy: () => Promise<unknown>;
	};
	p.groupBy = () => Promise.resolve(result);
	return p;
}

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => {
			const idx = selectCall++;
			return {
				from: vi.fn(() => ({
					where: vi.fn(() => awaitable(mockResults[idx] ?? [])),
				})),
			};
		}),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/recipes/availability");

type Handler = (ctx: never) => Promise<Response>;
const { GET } = Route.options.server!.handlers! as Record<string, Handler>;

type Ing = {
	recipeId: string;
	productId: string | null;
	quantity: string;
	quantityUnitId: string | null;
	groupName: string | null;
	optional: boolean;
};

function ing(overrides: Partial<Ing> & { recipeId: string }): Ing {
	return {
		productId: null,
		quantity: "1",
		quantityUnitId: null,
		groupName: null,
		optional: false,
		...overrides,
	};
}

function seed({
	ingredients,
	products,
	stock,
}: {
	ingredients: Ing[];
	products: { id: string; defaultQuantityUnitId: string | null }[];
	stock: { productId: string; totalQuantity: string }[];
}) {
	mockResults[0] = ingredients;
	mockResults[1] = products;
	mockResults[2] = stock;
	mockResults[3] = []; // global conversions
	mockResults[4] = []; // product conversions
}

describe("GET /api/recipes/availability optional handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectCall = 0;
		mockResults.length = 0;
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);

		const response = await GET({ request: makeGetRequest() } as never);

		expect(response.status).toBe(401);
	});

	it("marks a recipe sufficient when all required ingredients are stocked", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		seed({
			ingredients: [ing({ recipeId: "r-pancakes", productId: "p-flour" })],
			products: [{ id: "p-flour", defaultQuantityUnitId: null }],
			stock: [{ productId: "p-flour", totalQuantity: "5" }],
		});

		const response = await GET({ request: makeGetRequest() } as never);

		expect(await response.json()).toEqual({ "r-pancakes": "sufficient" });
	});

	it("marks a recipe deficit when a required ingredient is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		seed({
			ingredients: [ing({ recipeId: "r-pancakes", productId: "p-flour" })],
			products: [{ id: "p-flour", defaultQuantityUnitId: null }],
			stock: [], // no flour
		});

		const response = await GET({ request: makeGetRequest() } as never);

		expect(await response.json()).toEqual({ "r-pancakes": "deficit" });
	});

	it("stays sufficient when only an optional ingredient is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		seed({
			ingredients: [
				ing({ recipeId: "r-oatmeal", productId: "p-oats" }),
				ing({
					recipeId: "r-oatmeal",
					productId: "p-maple",
					optional: true,
				}),
			],
			products: [
				{ id: "p-oats", defaultQuantityUnitId: null },
				{ id: "p-maple", defaultQuantityUnitId: null },
			],
			stock: [{ productId: "p-oats", totalQuantity: "5" }], // maple missing
		});

		const response = await GET({ request: makeGetRequest() } as never);

		expect(await response.json()).toEqual({ "r-oatmeal": "sufficient" });
	});

	it("is deficit when an optional ingredient is stocked but a required one is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		seed({
			ingredients: [
				ing({ recipeId: "r-oatmeal", productId: "p-oats" }),
				ing({
					recipeId: "r-oatmeal",
					productId: "p-maple",
					optional: true,
				}),
			],
			products: [
				{ id: "p-oats", defaultQuantityUnitId: null },
				{ id: "p-maple", defaultQuantityUnitId: null },
			],
			stock: [{ productId: "p-maple", totalQuantity: "5" }], // oats missing
		});

		const response = await GET({ request: makeGetRequest() } as never);

		expect(await response.json()).toEqual({ "r-oatmeal": "deficit" });
	});

	it("skips a group entirely when every ingredient in the group is optional", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		seed({
			ingredients: [
				ing({ recipeId: "r-tacos", productId: "p-beef" }),
				ing({
					recipeId: "r-tacos",
					productId: "p-cilantro",
					groupName: "Toppings",
					optional: true,
				}),
				ing({
					recipeId: "r-tacos",
					productId: "p-lime",
					groupName: "Toppings",
					optional: true,
				}),
			],
			products: [
				{ id: "p-beef", defaultQuantityUnitId: null },
				{ id: "p-cilantro", defaultQuantityUnitId: null },
				{ id: "p-lime", defaultQuantityUnitId: null },
			],
			stock: [{ productId: "p-beef", totalQuantity: "1" }], // neither topping in stock
		});

		const response = await GET({ request: makeGetRequest() } as never);

		expect(await response.json()).toEqual({ "r-tacos": "sufficient" });
	});

	it("still enforces the group any-sufficient rule when not every group ingredient is optional", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		seed({
			ingredients: [
				ing({
					recipeId: "r-curry",
					productId: "p-coconut-milk",
					groupName: "Base",
				}),
				ing({
					recipeId: "r-curry",
					productId: "p-cream",
					groupName: "Base",
					optional: true,
				}),
			],
			products: [
				{ id: "p-coconut-milk", defaultQuantityUnitId: null },
				{ id: "p-cream", defaultQuantityUnitId: null },
			],
			stock: [], // neither option available
		});

		const response = await GET({ request: makeGetRequest() } as never);

		expect(await response.json()).toEqual({ "r-curry": "deficit" });
	});

	it("marks the group sufficient when the non-optional alternative is stocked", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		seed({
			ingredients: [
				ing({
					recipeId: "r-curry",
					productId: "p-coconut-milk",
					groupName: "Base",
				}),
				ing({
					recipeId: "r-curry",
					productId: "p-cream",
					groupName: "Base",
					optional: true,
				}),
			],
			products: [
				{ id: "p-coconut-milk", defaultQuantityUnitId: null },
				{ id: "p-cream", defaultQuantityUnitId: null },
			],
			stock: [{ productId: "p-coconut-milk", totalQuantity: "1" }],
		});

		const response = await GET({ request: makeGetRequest() } as never);

		expect(await response.json()).toEqual({ "r-curry": "sufficient" });
	});
});
