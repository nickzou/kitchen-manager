import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession } from "#src/tests/helpers/factories";
import { makeGetRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	mealPlanEntry: {},
	product: {},
	productUnitConversion: {},
	recipe: {},
	recipeIngredient: {},
	stockEntry: {},
	unitConversion: {},
}));

// Handler runs these select() calls in order:
// 0. joined rows (meal plan × recipe × ingredient × product)
// (only when rows non-empty; Promise.all:)
// 1. avg unit cost per product (stockEntry grouped by productId)
// 2. global unit conversions
// 3. product unit conversions
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
	"#src/routes/api/meal-plan-entries/cost-summary"
);
type Handler = (ctx: never) => Promise<Response>;
const { GET } = Route.options.server!.handlers! as Record<string, Handler>;

function summaryRequest() {
	return makeGetRequest(
		"/api/meal-plan-entries/cost-summary?startDate=2025-01-01&endDate=2025-01-07",
	);
}

type Row = {
	date: string;
	mealPlanEntryId: string;
	entryServings: number | null;
	recipeServings: number | null;
	recipeIsMealPrep: boolean;
	ingredientQuantity: string;
	ingredientUnitId: string | null;
	ingredientGroupName: string | null;
	productId: string;
	productDefaultUnitId: string | null;
};

function row(overrides: Partial<Row> & { productId: string }): Row {
	return {
		date: "2025-01-01",
		mealPlanEntryId: "mpe-1",
		entryServings: null,
		recipeServings: 4,
		recipeIsMealPrep: false,
		ingredientQuantity: "1",
		ingredientUnitId: null,
		ingredientGroupName: null,
		productDefaultUnitId: null,
		...overrides,
	};
}

describe("GET /api/meal-plan-entries/cost-summary", () => {
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

	it("returns an empty object when no planned ingredients", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [];

		const response = await GET({ request: summaryRequest() } as never);

		expect(await response.json()).toEqual({});
	});

	it("sums per-day cost using avg unit cost × converted qty × scale factor", async () => {
		// Rice: avg cost $2/g. Egg: avg cost $0.5/unit.
		// Day 1: 100g rice (recipe 4, entry 4 → scale 1) = $200; 1 egg = $0.5.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				date: "2025-01-01",
				productId: "p-rice",
				productDefaultUnitId: "unit-g",
				ingredientUnitId: "unit-g",
				ingredientQuantity: "100",
			}),
			row({
				date: "2025-01-01",
				mealPlanEntryId: "mpe-2",
				productId: "p-egg",
				productDefaultUnitId: null,
				ingredientUnitId: null,
				ingredientQuantity: "1",
			}),
		];
		mockResults[1] = [
			{ productId: "p-rice", avgCost: "2" },
			{ productId: "p-egg", avgCost: "0.5" },
		];
		mockResults[2] = []; // global conversions
		mockResults[3] = []; // product conversions

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].total).toBeCloseTo(200.5);
		expect(data["2025-01-01"].complete).toBe(true);
	});

	it("scales the contribution by entry/recipe servings ratio", async () => {
		// Recipe servings 4, entry servings 8 → scale 2.
		// 1 unit × 2 × $5 = $10.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				productId: "p-x",
				productDefaultUnitId: null,
				ingredientUnitId: null,
				ingredientQuantity: "1",
				recipeServings: 4,
				entryServings: 8,
			}),
		];
		mockResults[1] = [{ productId: "p-x", avgCost: "5" }];
		mockResults[2] = [];
		mockResults[3] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].total).toBeCloseTo(10);
	});

	it("averages alternatives within an ingredient group", async () => {
		// Toppings group: cilantro $1, lime $0.30. Day total = $0.65.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				productId: "p-cilantro",
				productDefaultUnitId: null,
				ingredientUnitId: null,
				ingredientGroupName: "Toppings",
			}),
			row({
				productId: "p-lime",
				productDefaultUnitId: null,
				ingredientUnitId: null,
				ingredientGroupName: "Toppings",
			}),
		];
		mockResults[1] = [
			{ productId: "p-cilantro", avgCost: "1" },
			{ productId: "p-lime", avgCost: "0.30" },
		];
		mockResults[2] = [];
		mockResults[3] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].total).toBeCloseTo(0.65);
	});

	it("excludes meal-prep recipes from the day total", async () => {
		// Two rows: one meal-prep, one regular. Only the regular one should
		// contribute to the day total.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				productId: "p-rice",
				productDefaultUnitId: null,
				ingredientUnitId: null,
				ingredientQuantity: "1",
			}),
			row({
				mealPlanEntryId: "mpe-prep",
				productId: "p-chicken",
				productDefaultUnitId: null,
				ingredientUnitId: null,
				ingredientQuantity: "5",
				recipeIsMealPrep: true,
			}),
		];
		mockResults[1] = [
			{ productId: "p-rice", avgCost: "2" },
			{ productId: "p-chicken", avgCost: "10" },
		];
		mockResults[2] = [];
		mockResults[3] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].total).toBeCloseTo(2);
	});

	it("flags the day incomplete when an ingredient lacks a priced stock entry", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				productId: "p-rice",
				productDefaultUnitId: null,
				ingredientUnitId: null,
				ingredientQuantity: "1",
			}),
			row({
				productId: "p-untracked",
				productDefaultUnitId: null,
				ingredientUnitId: null,
				ingredientQuantity: "1",
			}),
		];
		mockResults[1] = [{ productId: "p-rice", avgCost: "2" }];
		mockResults[2] = [];
		mockResults[3] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].total).toBeCloseTo(2);
		expect(data["2025-01-01"].complete).toBe(false);
	});
});
