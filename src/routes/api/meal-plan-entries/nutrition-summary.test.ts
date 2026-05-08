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
	unitConversion: {},
}));

// Handler runs these select() calls in order:
// 0. joined rows (meal plan × recipe × ingredient × product)
// 1. global unit conversions
// (only when some row's product has no nutrition:)
// 2. source recipes for producible products
// 3. source recipe ingredients
// 4. source recipe ingredient products (nutrition)
// 5. product unit conversions for source recipe ingredient products
let selectCall = 0;
const mockResults: unknown[] = [];

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => {
			const idx = selectCall++;
			return {
				from: vi.fn(() => {
					const chain: Record<string, unknown> = {};
					chain.innerJoin = vi.fn(() => chain);
					chain.where = vi.fn(() => Promise.resolve(mockResults[idx] ?? []));
					return chain;
				}),
			};
		}),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import(
	"#src/routes/api/meal-plan-entries/nutrition-summary"
);
type Handler = (ctx: never) => Promise<Response>;
const { GET } = Route.options.server!.handlers! as Record<string, Handler>;

function summaryRequest() {
	return makeGetRequest(
		"/api/meal-plan-entries/nutrition-summary?startDate=2025-01-01&endDate=2025-01-07",
	);
}

type Row = {
	date: string;
	mealPlanEntryId: string;
	entryServings: number | null;
	recipeServings: number | null;
	ingredientQuantity: string;
	ingredientUnitId: string | null;
	ingredientGroupName: string | null;
	productId: string;
	productDefaultUnitId: string | null;
	productNutritionBaseAmount: string;
	productNutritionBaseUnitId: string | null;
	productCalories: string | null;
	productProtein: string | null;
	productFat: string | null;
	productCarbs: string | null;
};

function row(overrides: Partial<Row> & { productId: string }): Row {
	return {
		date: "2025-01-01",
		mealPlanEntryId: "mpe-1",
		entryServings: null,
		recipeServings: 4,
		ingredientQuantity: "1",
		ingredientUnitId: null,
		ingredientGroupName: null,
		productDefaultUnitId: null,
		productNutritionBaseAmount: "1",
		productNutritionBaseUnitId: null,
		productCalories: null,
		productProtein: null,
		productFat: null,
		productCarbs: null,
		...overrides,
	};
}

describe("GET /api/meal-plan-entries/nutrition-summary", () => {
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

	it("returns an empty object when there are no planned ingredients", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [];
		mockResults[1] = [];

		const response = await GET({ request: summaryRequest() } as never);

		expect(await response.json()).toEqual({});
	});

	it("sums per-day nutrition for ungrouped ingredients", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		// 1 unit of a 100-cal/unit product on Jan 1, recipe servings 4 entry 4
		// → scaleFactor 1 → 100 cal.
		mockResults[0] = [
			row({
				date: "2025-01-01",
				productId: "p-rice",
				productCalories: "100",
				ingredientQuantity: "1",
			}),
			row({
				date: "2025-01-01",
				mealPlanEntryId: "mpe-2",
				productId: "p-egg",
				productCalories: "70",
				ingredientQuantity: "1",
			}),
		];
		mockResults[1] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].calories).toBeCloseTo(170);
	});

	it("honors the product nutrition base (per-N-unit)", async () => {
		// Product: 350 cal per 100 g. Ingredient: 50 g.
		// Expected: (50 / 100) * 350 = 175.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				productId: "p-flour",
				productCalories: "350",
				productDefaultUnitId: "unit-g",
				productNutritionBaseAmount: "100",
				productNutritionBaseUnitId: "unit-g",
				ingredientUnitId: "unit-g",
				ingredientQuantity: "50",
			}),
		];
		mockResults[1] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].calories).toBeCloseTo(175);
	});

	it("averages alternatives within a single ingredient group", async () => {
		// Toppings group: cilantro (50 cal) and lime (30 cal). Should add (50+30)/2.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				productId: "p-cilantro",
				productCalories: "50",
				ingredientGroupName: "Toppings",
			}),
			row({
				productId: "p-lime",
				productCalories: "30",
				ingredientGroupName: "Toppings",
			}),
		];
		mockResults[1] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].calories).toBeCloseTo(40);
	});

	it("evaluates the same group on different meal-plan entries independently", async () => {
		// Same Toppings group on two separate planned meals (different mpe ids
		// and dates). Each averages alone — Jan 1 sees 40, Jan 2 sees 40.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				date: "2025-01-01",
				mealPlanEntryId: "mpe-1",
				productId: "p-cilantro",
				productCalories: "50",
				ingredientGroupName: "Toppings",
			}),
			row({
				date: "2025-01-01",
				mealPlanEntryId: "mpe-1",
				productId: "p-lime",
				productCalories: "30",
				ingredientGroupName: "Toppings",
			}),
			row({
				date: "2025-01-02",
				mealPlanEntryId: "mpe-2",
				productId: "p-cilantro",
				productCalories: "50",
				ingredientGroupName: "Toppings",
			}),
			row({
				date: "2025-01-02",
				mealPlanEntryId: "mpe-2",
				productId: "p-lime",
				productCalories: "30",
				ingredientGroupName: "Toppings",
			}),
		];
		mockResults[1] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].calories).toBeCloseTo(40);
		expect(data["2025-01-02"].calories).toBeCloseTo(40);
	});

	it("derives nutrition from source recipe when ingredient product has none", async () => {
		// Meal-plan ingredient is "p-broth" (a producible product) used at 200 ml
		// in a recipe with servings 4, entry servings 4 → scaleFactor 1.
		// Source recipe makes 1000 ml of broth from 1000 ml water (0 cal) and
		// 200 g chicken (165 cal/100 g = 330 cal total).
		// Derived: 330 cal per 1000 ml. Used 200 ml → 66 cal.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				date: "2025-01-01",
				productId: "p-broth",
				productCalories: null,
				productProtein: null,
				productFat: null,
				productCarbs: null,
				productDefaultUnitId: "unit-ml",
				productNutritionBaseAmount: "1",
				productNutritionBaseUnitId: "unit-ml",
				ingredientUnitId: "unit-ml",
				ingredientQuantity: "200",
			}),
		];
		mockResults[1] = []; // no global conversions
		mockResults[2] = [
			{
				id: "recipe-stock",
				producedProductId: "p-broth",
				producedQuantity: "1000",
				producedQuantityUnitId: "unit-ml",
			},
		];
		mockResults[3] = [
			{
				recipeId: "recipe-stock",
				productId: "p-water",
				quantity: "1000",
				quantityUnitId: "unit-ml",
			},
			{
				recipeId: "recipe-stock",
				productId: "p-chicken",
				quantity: "200",
				quantityUnitId: "unit-g",
			},
		];
		mockResults[4] = [
			{
				id: "p-water",
				defaultQuantityUnitId: "unit-ml",
				nutritionBaseAmount: "100",
				nutritionBaseUnitId: "unit-ml",
				calories: null,
				protein: null,
				fat: null,
				carbs: null,
			},
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
		mockResults[5] = []; // no product-specific conversions

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].calories).toBeCloseTo(66);
	});

	it("scales by entry/recipe servings ratio", async () => {
		// Recipe servings 4, entry servings 8 → scaleFactor 2.
		// 1 unit × 2 × 100 cal = 200.
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockResults[0] = [
			row({
				productId: "p-rice",
				productCalories: "100",
				recipeServings: 4,
				entryServings: 8,
			}),
		];
		mockResults[1] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data["2025-01-01"].calories).toBeCloseTo(200);
	});
});
