import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	makeProduct,
	makeQuantityUnit,
	makeSession,
} from "#src/tests/helpers/factories";
import { makeGetRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	mealPlanEntry: {},
	product: {},
	quantityUnit: {},
	recipe: {},
	recipeIngredient: {},
	stockEntry: {},
	unitConversion: {},
}));

// Handler runs these queries in order:
// 0. meal plan entries (joined with recipe + recipeIngredient)
// 1. tracked products (minStockAmount > 0)
// 2. quantity units
// 3. products by id (only if productIds non-empty)
// 4. stock sums by product (only if productIds non-empty)
// 5. unit conversions (only if productIds non-empty)
let selectCall = 0;
const mockResults: unknown[] = [];

// Return a Promise with .groupBy tacked on, so `.where()` can be awaited
// directly (the common case) OR chained into `.groupBy()` (the stock query).
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
				from: vi.fn(() => {
					const chain: Record<string, unknown> = {};
					chain.innerJoin = vi.fn(() => chain);
					chain.where = vi.fn(() => awaitable(mockResults[idx] ?? []));
					return chain;
				}),
			};
		}),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import(
	"#src/routes/api/meal-plan-entries/ingredient-summary"
);

type Handler = (ctx: never) => Promise<Response>;
const { GET } = Route.options.server!.handlers! as Record<string, Handler>;

function summaryRequest() {
	return makeGetRequest(
		"/api/meal-plan-entries/ingredient-summary?startDate=2025-01-01&endDate=2025-01-07",
	);
}

describe("GET /api/meal-plan-entries/ingredient-summary restock", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectCall = 0;
		mockResults.length = 0;
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);

		const response = await GET({ request: summaryRequest() } as never);

		expect(response.status).toBe(401);
	});

	it("returns empty arrays when no meal plan entries and no tracked products", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = []; // entries
		mockResults[1] = []; // tracked products (nothing has min > 0)
		mockResults[2] = []; // units

		const response = await GET({ request: summaryRequest() } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.ingredients).toEqual([]);
		expect(data.unlinkedIngredients).toEqual([]);
		expect(data.restock).toEqual([]);
	});

	it("lists tracked products below their min stock as restock items", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const milk = makeProduct({
			id: "p-milk",
			name: "Milk",
			minStockAmount: "5",
		});
		mockResults[0] = []; // no meal plan entries
		mockResults[1] = [milk]; // tracked
		mockResults[2] = []; // units
		mockResults[3] = [milk]; // products by id
		mockResults[4] = [{ productId: "p-milk", totalQuantity: "2" }]; // stock
		mockResults[5] = []; // conversions

		const response = await GET({ request: summaryRequest() } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.restock).toHaveLength(1);
		expect(data.restock[0]).toMatchObject({
			productId: "p-milk",
			productName: "Milk",
			minStock: 5,
			stockQuantity: 2,
		});
	});

	it("excludes tracked products that are at or above their min stock", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const milk = makeProduct({
			id: "p-milk",
			name: "Milk",
			minStockAmount: "5",
		});
		const eggs = makeProduct({
			id: "p-eggs",
			name: "Eggs",
			minStockAmount: "6",
		});
		mockResults[0] = [];
		mockResults[1] = [milk, eggs];
		mockResults[2] = [];
		mockResults[3] = [milk, eggs];
		mockResults[4] = [
			{ productId: "p-milk", totalQuantity: "5" }, // exactly at min
			{ productId: "p-eggs", totalQuantity: "12" }, // above min
		];
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data.restock).toEqual([]);
	});

	it("excludes tracked products that are already in the planned ingredients list", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const milk = makeProduct({
			id: "p-milk",
			name: "Milk",
			minStockAmount: "5",
		});
		mockResults[0] = [
			{
				entryServings: null,
				recipeServings: 4,
				ingredientProductId: "p-milk",
				ingredientQuantity: "1",
				ingredientUnitId: null,
				ingredientNotes: null,
			},
		];
		mockResults[1] = [milk]; // tracked and below min
		mockResults[2] = [];
		mockResults[3] = [milk];
		mockResults[4] = [{ productId: "p-milk", totalQuantity: "1" }]; // below both need and min
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data.ingredients).toHaveLength(1);
		expect(data.ingredients[0].productId).toBe("p-milk");
		expect(data.restock).toEqual([]);
	});

	it("returns only the below-min products when tracked list is mixed", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const milk = makeProduct({
			id: "p-milk",
			name: "Milk",
			minStockAmount: "5",
		});
		const eggs = makeProduct({
			id: "p-eggs",
			name: "Eggs",
			minStockAmount: "6",
		});
		const flour = makeProduct({
			id: "p-flour",
			name: "Flour",
			minStockAmount: "10",
		});
		mockResults[0] = [];
		mockResults[1] = [milk, eggs, flour];
		mockResults[2] = [];
		mockResults[3] = [milk, eggs, flour];
		mockResults[4] = [
			{ productId: "p-milk", totalQuantity: "2" }, // below
			{ productId: "p-eggs", totalQuantity: "6" }, // at min
			{ productId: "p-flour", totalQuantity: "3" }, // below
		];
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		const ids = data.restock.map((r: { productId: string }) => r.productId);
		expect(ids).toHaveLength(2);
		expect(ids).toEqual(expect.arrayContaining(["p-milk", "p-flour"]));
		expect(ids).not.toContain("p-eggs");
	});

	it("populates unit labels for restock items from the product's default unit", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const grams = makeQuantityUnit({
			id: "unit-grams",
			name: "Grams",
			abbreviation: "g",
		});
		const flour = makeProduct({
			id: "p-flour",
			name: "Flour",
			minStockAmount: "1000",
			defaultQuantityUnitId: "unit-grams",
		});
		mockResults[0] = [];
		mockResults[1] = [flour];
		mockResults[2] = [grams];
		mockResults[3] = [flour];
		mockResults[4] = [{ productId: "p-flour", totalQuantity: "200" }];
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data.restock).toHaveLength(1);
		expect(data.restock[0]).toMatchObject({
			quantityUnitId: "unit-grams",
			unitName: "Grams",
			unitAbbreviation: "g",
		});
	});
});
