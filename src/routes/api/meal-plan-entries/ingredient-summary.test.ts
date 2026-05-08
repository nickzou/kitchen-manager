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
	productUnitConversion: {},
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
// 5. global unit conversions (only if productIds non-empty)
// 6. product unit conversions (only if productIds non-empty)
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

	it("flags a planned ingredient as deficit when stock covers need but falls below min after cooking", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const flour = makeProduct({
			id: "p-flour",
			name: "Flour",
			minStockAmount: "500",
		});
		mockResults[0] = [
			{
				entryServings: null,
				recipeServings: 4,
				ingredientProductId: "p-flour",
				ingredientQuantity: "100",
				ingredientUnitId: null,
				ingredientNotes: null,
			},
		];
		mockResults[1] = []; // no need to list as tracked — already planned
		mockResults[2] = [];
		mockResults[3] = [flour];
		mockResults[4] = [{ productId: "p-flour", totalQuantity: "200" }]; // enough for recipe, below min after
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data.ingredients).toHaveLength(1);
		expect(data.ingredients[0]).toMatchObject({
			status: "deficit",
			neededQuantity: 100,
			minStockBuffer: 500,
			stockQuantity: 200,
		});
	});

	it("marks a planned ingredient sufficient when stock covers need plus min", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const flour = makeProduct({
			id: "p-flour",
			name: "Flour",
			minStockAmount: "500",
		});
		mockResults[0] = [
			{
				entryServings: null,
				recipeServings: 4,
				ingredientProductId: "p-flour",
				ingredientQuantity: "100",
				ingredientUnitId: null,
				ingredientNotes: null,
			},
		];
		mockResults[1] = [];
		mockResults[2] = [];
		mockResults[3] = [flour];
		mockResults[4] = [{ productId: "p-flour", totalQuantity: "700" }]; // 100 needed + 500 min buffer + 100 spare
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data.ingredients[0]).toMatchObject({
			status: "sufficient",
			minStockBuffer: 500,
		});
	});

	it("reports zero buffer when the product has no min stock threshold", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const salt = makeProduct({
			id: "p-salt",
			name: "Salt",
			minStockAmount: "0",
		});
		mockResults[0] = [
			{
				entryServings: null,
				recipeServings: 4,
				ingredientProductId: "p-salt",
				ingredientQuantity: "5",
				ingredientUnitId: null,
				ingredientNotes: null,
			},
		];
		mockResults[1] = [];
		mockResults[2] = [];
		mockResults[3] = [salt];
		mockResults[4] = [{ productId: "p-salt", totalQuantity: "5" }];
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data.ingredients[0]).toMatchObject({
			status: "sufficient",
			minStockBuffer: 0,
		});
	});

	it("converts the min-stock buffer into the ingredient's unit for display", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const ml = makeQuantityUnit({
			id: "unit-ml",
			name: "Millilitres",
			abbreviation: "ml",
		});
		const cups = makeQuantityUnit({
			id: "unit-cups",
			name: "Cups",
			abbreviation: "c",
		});
		const milk = makeProduct({
			id: "p-milk",
			name: "Milk",
			minStockAmount: "480", // 480ml (product's default unit)
			defaultQuantityUnitId: "unit-ml",
		});
		mockResults[0] = [
			{
				entryServings: null,
				recipeServings: 4,
				ingredientProductId: "p-milk",
				ingredientQuantity: "1", // 1 cup in the recipe
				ingredientUnitId: "unit-cups",
				ingredientNotes: null,
			},
		];
		mockResults[1] = [];
		mockResults[2] = [ml, cups];
		mockResults[3] = [milk];
		mockResults[4] = [{ productId: "p-milk", totalQuantity: "200" }]; // 200ml stock, well below need+min
		mockResults[5] = [
			{ fromUnitId: "unit-cups", toUnitId: "unit-ml", factor: "240" },
		];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data.ingredients[0].status).toBe("deficit");
		// 480ml → 480/240 = 2 cups
		expect(data.ingredients[0].minStockBuffer).toBeCloseTo(2);
		expect(data.ingredients[0].neededQuantity).toBe(1);
	});

	it("uses product-specific conversions when classifying ingredient status", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const grams = makeQuantityUnit({
			id: "unit-g",
			name: "Grams",
			abbreviation: "g",
		});
		const tsp = makeQuantityUnit({
			id: "unit-tsp",
			name: "Teaspoon",
			abbreviation: "tsp",
		});
		const cornstarch = makeProduct({
			id: "p-cornstarch",
			name: "Cornstarch",
			defaultQuantityUnitId: "unit-g",
		});
		mockResults[0] = [
			{
				entryServings: null,
				recipeServings: 4,
				ingredientProductId: "p-cornstarch",
				ingredientQuantity: "2",
				ingredientUnitId: "unit-tsp",
				ingredientNotes: null,
			},
		];
		mockResults[1] = [];
		mockResults[2] = [grams, tsp];
		mockResults[3] = [cornstarch];
		mockResults[4] = [{ productId: "p-cornstarch", totalQuantity: "100" }];
		mockResults[5] = []; // no global conversions
		mockResults[6] = [
			{
				productId: "p-cornstarch",
				fromUnitId: "unit-tsp",
				toUnitId: "unit-g",
				factor: "3",
			},
		];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		expect(data.ingredients[0].status).toBe("sufficient");
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

	function groupRow(opts: {
		mpe: string;
		date: string;
		ing: string;
		productId: string;
		quantity?: string;
		group?: string;
		sortOrder?: number;
	}) {
		return {
			mealPlanEntryId: opts.mpe,
			mealPlanEntryDate: opts.date,
			entryServings: null,
			recipeServings: 4,
			ingredientId: opts.ing,
			ingredientProductId: opts.productId,
			ingredientQuantity: opts.quantity ?? "1",
			ingredientUnitId: null,
			ingredientNotes: null,
			ingredientGroupName: opts.group ?? "Toppings",
			ingredientSortOrder: opts.sortOrder ?? 0,
		};
	}

	it("drops alternative group ingredients when one in the group is sufficiently stocked", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const cilantro = makeProduct({ id: "p-cilantro", name: "Cilantro" });
		const lime = makeProduct({ id: "p-lime", name: "Lime" });
		mockResults[0] = [
			groupRow({
				mpe: "mpe-1",
				date: "2025-01-01",
				ing: "ing-cilantro",
				productId: "p-cilantro",
			}),
			groupRow({
				mpe: "mpe-1",
				date: "2025-01-01",
				ing: "ing-lime",
				productId: "p-lime",
				sortOrder: 1,
			}),
		];
		mockResults[1] = [];
		mockResults[2] = [];
		mockResults[3] = [cilantro, lime];
		mockResults[4] = [{ productId: "p-cilantro", totalQuantity: "5" }];
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		const ids = data.ingredients.map((i: { productId: string }) => i.productId);
		expect(ids).toEqual(["p-cilantro"]);
	});

	it("keeps every group ingredient when none have enough stock", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const cilantro = makeProduct({ id: "p-cilantro", name: "Cilantro" });
		const lime = makeProduct({ id: "p-lime", name: "Lime" });
		mockResults[0] = [
			groupRow({
				mpe: "mpe-1",
				date: "2025-01-01",
				ing: "ing-cilantro",
				productId: "p-cilantro",
			}),
			groupRow({
				mpe: "mpe-1",
				date: "2025-01-01",
				ing: "ing-lime",
				productId: "p-lime",
				sortOrder: 1,
			}),
		];
		mockResults[1] = [];
		mockResults[2] = [];
		mockResults[3] = [cilantro, lime];
		mockResults[4] = []; // neither in stock
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		const ids = data.ingredients
			.map((i: { productId: string }) => i.productId)
			.sort();
		expect(ids).toEqual(["p-cilantro", "p-lime"]);
	});

	it("covers both nights when stock can cover multiple meals", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const cilantro = makeProduct({ id: "p-cilantro", name: "Cilantro" });
		const lime = makeProduct({ id: "p-lime", name: "Lime" });
		// Two taco nights, 5 cilantro on hand. Each meal needs 1 cilantro
		// or 1 lime; cilantro covers both nights → lime dropped both times.
		mockResults[0] = [
			groupRow({
				mpe: "mpe-1",
				date: "2025-01-01",
				ing: "ing-c1",
				productId: "p-cilantro",
			}),
			groupRow({
				mpe: "mpe-1",
				date: "2025-01-01",
				ing: "ing-l1",
				productId: "p-lime",
				sortOrder: 1,
			}),
			groupRow({
				mpe: "mpe-2",
				date: "2025-01-02",
				ing: "ing-c2",
				productId: "p-cilantro",
			}),
			groupRow({
				mpe: "mpe-2",
				date: "2025-01-02",
				ing: "ing-l2",
				productId: "p-lime",
				sortOrder: 1,
			}),
		];
		mockResults[1] = [];
		mockResults[2] = [];
		mockResults[3] = [cilantro, lime];
		mockResults[4] = [{ productId: "p-cilantro", totalQuantity: "5" }];
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		const ids = data.ingredients.map((i: { productId: string }) => i.productId);
		expect(ids).toEqual(["p-cilantro"]);
	});

	it("only covers as many nights as stock allows; later meals retain their group alternatives", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const cilantro = makeProduct({ id: "p-cilantro", name: "Cilantro" });
		const lime = makeProduct({ id: "p-lime", name: "Lime" });
		// Two taco nights, 1 cilantro on hand. First night picks cilantro
		// (and drops its lime). Second night sees cilantro depleted and lime
		// still at 0 → no skip; both alternatives remain in the list.
		mockResults[0] = [
			groupRow({
				mpe: "mpe-1",
				date: "2025-01-01",
				ing: "ing-c1",
				productId: "p-cilantro",
			}),
			groupRow({
				mpe: "mpe-1",
				date: "2025-01-01",
				ing: "ing-l1",
				productId: "p-lime",
				sortOrder: 1,
			}),
			groupRow({
				mpe: "mpe-2",
				date: "2025-01-02",
				ing: "ing-c2",
				productId: "p-cilantro",
			}),
			groupRow({
				mpe: "mpe-2",
				date: "2025-01-02",
				ing: "ing-l2",
				productId: "p-lime",
				sortOrder: 1,
			}),
		];
		mockResults[1] = [];
		mockResults[2] = [];
		mockResults[3] = [cilantro, lime];
		mockResults[4] = [{ productId: "p-cilantro", totalQuantity: "1" }];
		mockResults[5] = [];

		const response = await GET({ request: summaryRequest() } as never);

		const data = await response.json();
		const ids = data.ingredients
			.map((i: { productId: string }) => i.productId)
			.sort();
		// Cilantro appears (used by night 1 + still in night 2's group),
		// lime appears (kept on night 2 since cilantro depleted).
		expect(ids).toEqual(["p-cilantro", "p-lime"]);
	});
});
