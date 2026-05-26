import { describe, expect, it } from "vitest";
import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { getRecipeNutrition } from "./get-recipe-nutrition";

function makeProduct(overrides: Partial<Product> = {}): Product {
	return {
		id: "p1",
		name: "Flour",
		categoryIds: [],
		description: null,
		image: null,
		defaultQuantityUnitId: "unit-1",
		minStockAmount: "0",
		isFood: true,
		defaultExpirationDays: null,
		defaultConsumeAmount: null,
		defaultConsumeUnitId: null,
		calories: null,
		protein: null,
		fat: null,
		carbs: null,
		nutritionBaseAmount: "1",
		nutritionBaseUnitId: null,
		defaultTareWeight: null,
		defaultSkipStockDeduction: false,
		pinned: false,
		pinnedSortOrder: null,
		userId: "u1",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function makeIngredient(
	overrides: Partial<RecipeIngredient> = {},
): RecipeIngredient {
	return {
		id: "i1",
		recipeId: "r1",
		productId: "p1",
		quantity: "1",
		quantityUnitId: "unit-1",
		notes: null,
		groupName: null,
		optional: false,
		skipStockDeduction: false,
		sortOrder: 0,
		userId: "u1",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function makeConversion(
	overrides: Partial<UnitConversion> = {},
): UnitConversion {
	return {
		id: "c1",
		fromUnitId: "unit-1",
		toUnitId: "unit-2",
		factor: "1000",
		userId: "u1",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("getRecipeNutrition", () => {
	it("returns null when no ingredients have nutrition", () => {
		const result = getRecipeNutrition({
			ingredients: [makeIngredient()],
			products: [makeProduct()],
			unitConversions: [],
			scaleFactor: 1,
		});
		expect(result).toBeNull();
	});

	it("computes nutrition for a single ingredient", () => {
		const result = getRecipeNutrition({
			ingredients: [makeIngredient({ quantity: "2" })],
			products: [
				makeProduct({
					calories: "100",
					protein: "10",
					fat: "5",
					carbs: "20",
				}),
			],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result).toEqual({
			calories: 200,
			protein: 20,
			fat: 10,
			carbs: 40,
			ingredientsWithNutrition: 1,
			ingredientsTotal: 1,
		});
	});

	it("applies scaleFactor", () => {
		const result = getRecipeNutrition({
			ingredients: [makeIngredient()],
			products: [
				makeProduct({
					calories: "100",
					protein: "10",
					fat: "5",
					carbs: "20",
				}),
			],
			unitConversions: [],
			scaleFactor: 3,
		});

		expect(result).toEqual({
			calories: 300,
			protein: 30,
			fat: 15,
			carbs: 60,
			ingredientsWithNutrition: 1,
			ingredientsTotal: 1,
		});
	});

	it("converts units via conversion graph", () => {
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({ quantityUnitId: "unit-1", quantity: "1" }),
			],
			products: [
				makeProduct({
					defaultQuantityUnitId: "unit-2",
					calories: "50",
					protein: "5",
					fat: "2",
					carbs: "10",
				}),
			],
			unitConversions: [makeConversion()],
			scaleFactor: 1,
		});

		expect(result).toEqual({
			calories: 50000,
			protein: 5000,
			fat: 2000,
			carbs: 10000,
			ingredientsWithNutrition: 1,
			ingredientsTotal: 1,
		});
	});

	it("skips ingredients without matching product", () => {
		const result = getRecipeNutrition({
			ingredients: [makeIngredient({ productId: "nonexistent" })],
			products: [],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result).toBeNull();
	});

	it("skips ingredients without productId", () => {
		const result = getRecipeNutrition({
			ingredients: [makeIngredient({ productId: null })],
			products: [],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result).toBeNull();
	});

	it("reports partial coverage", () => {
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({ id: "i1", productId: "p1" }),
				makeIngredient({ id: "i2", productId: "p2" }),
			],
			products: [
				makeProduct({
					id: "p1",
					calories: "100",
					protein: "10",
					fat: "5",
					carbs: "20",
				}),
				makeProduct({ id: "p2" }),
			],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result?.ingredientsWithNutrition).toBe(1);
		expect(result?.ingredientsTotal).toBe(2);
	});

	it("handles partial nutrition fields on product", () => {
		const result = getRecipeNutrition({
			ingredients: [makeIngredient()],
			products: [makeProduct({ calories: "200" })],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result).toEqual({
			calories: 200,
			protein: 0,
			fat: 0,
			carbs: 0,
			ingredientsWithNutrition: 1,
			ingredientsTotal: 1,
		});
	});

	it("treats nutrition values as 'per nutritionBaseAmount of nutritionBaseUnitId'", () => {
		// Product: 350 cal per 100 g (default unit). Ingredient: 50 g.
		// Expected: (50 / 100) * 350 = 175 cal.
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({ quantity: "50", quantityUnitId: "unit-1" }),
			],
			products: [
				makeProduct({
					defaultQuantityUnitId: "unit-1",
					calories: "350",
					protein: "10",
					nutritionBaseAmount: "100",
					nutritionBaseUnitId: "unit-1",
				}),
			],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result?.calories).toBeCloseTo(175);
		expect(result?.protein).toBeCloseTo(5);
	});

	it("converts ingredient unit into the nutrition base unit before applying", () => {
		// Product: 60 cal per 100 ml (default ml). Ingredient: 1 cup; 1 cup = 240 ml.
		// Expected multiplier = 240 / 100 = 2.4 → calories = 2.4 * 60 = 144.
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({ quantity: "1", quantityUnitId: "unit-cup" }),
			],
			products: [
				makeProduct({
					defaultQuantityUnitId: "unit-ml",
					calories: "60",
					nutritionBaseAmount: "100",
					nutritionBaseUnitId: "unit-ml",
				}),
			],
			unitConversions: [
				{
					id: "c1",
					fromUnitId: "unit-cup",
					toUnitId: "unit-ml",
					factor: "240",
					userId: "u1",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
				},
			],
			scaleFactor: 1,
		});

		expect(result?.calories).toBeCloseTo(144);
	});

	it("falls back to defaultQuantityUnitId when nutritionBaseUnitId is null", () => {
		// Product: 8 cal per 1 ml (legacy shape — nutritionBaseUnitId null).
		// Ingredient: 50 ml. Expected: 50 * 8 = 400 cal.
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({ quantity: "50", quantityUnitId: "unit-ml" }),
			],
			products: [
				makeProduct({
					defaultQuantityUnitId: "unit-ml",
					calories: "8",
					nutritionBaseAmount: "1",
					nutritionBaseUnitId: null,
				}),
			],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result?.calories).toBeCloseTo(400);
	});

	it("scales the multiplier with scaleFactor when a base is set", () => {
		// Product: 100 cal per 100 g. Ingredient: 50 g. Scale: 4.
		// Expected: (50 * 4 / 100) * 100 = 200 cal.
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({ quantity: "50", quantityUnitId: "unit-1" }),
			],
			products: [
				makeProduct({
					defaultQuantityUnitId: "unit-1",
					calories: "100",
					nutritionBaseAmount: "100",
					nutritionBaseUnitId: "unit-1",
				}),
			],
			unitConversions: [],
			scaleFactor: 4,
		});

		expect(result?.calories).toBeCloseTo(200);
	});

	it("averages calories across alternatives in the same ingredient group", () => {
		// Group "Toppings" has cilantro (50 cal) and lime (30 cal) at 1 unit each.
		// Cook uses one — so the recipe total should reflect the average (40),
		// not the sum (80).
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({
					id: "i-cilantro",
					productId: "p-cilantro",
					quantity: "1",
					groupName: "Toppings",
				}),
				makeIngredient({
					id: "i-lime",
					productId: "p-lime",
					quantity: "1",
					groupName: "Toppings",
				}),
			],
			products: [
				makeProduct({ id: "p-cilantro", calories: "50" }),
				makeProduct({ id: "p-lime", calories: "30" }),
			],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result?.calories).toBeCloseTo(40);
	});

	it("sums ungrouped ingredients and only averages within each group", () => {
		// Beef (200 cal) ungrouped + a Toppings group of cilantro (50) and lime (30).
		// Expected: 200 + (50 + 30) / 2 = 240.
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({
					id: "i-beef",
					productId: "p-beef",
					quantity: "1",
				}),
				makeIngredient({
					id: "i-cilantro",
					productId: "p-cilantro",
					quantity: "1",
					groupName: "Toppings",
				}),
				makeIngredient({
					id: "i-lime",
					productId: "p-lime",
					quantity: "1",
					groupName: "Toppings",
				}),
			],
			products: [
				makeProduct({ id: "p-beef", calories: "200" }),
				makeProduct({ id: "p-cilantro", calories: "50" }),
				makeProduct({ id: "p-lime", calories: "30" }),
			],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result?.calories).toBeCloseTo(240);
	});

	it("averages each group independently when a recipe has multiple groups", () => {
		// Group A: 100, 200 → avg 150. Group B: 30, 50 → avg 40. Total 190.
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({
					id: "i-a1",
					productId: "p-a1",
					quantity: "1",
					groupName: "A",
				}),
				makeIngredient({
					id: "i-a2",
					productId: "p-a2",
					quantity: "1",
					groupName: "A",
				}),
				makeIngredient({
					id: "i-b1",
					productId: "p-b1",
					quantity: "1",
					groupName: "B",
				}),
				makeIngredient({
					id: "i-b2",
					productId: "p-b2",
					quantity: "1",
					groupName: "B",
				}),
			],
			products: [
				makeProduct({ id: "p-a1", calories: "100" }),
				makeProduct({ id: "p-a2", calories: "200" }),
				makeProduct({ id: "p-b1", calories: "30" }),
				makeProduct({ id: "p-b2", calories: "50" }),
			],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result?.calories).toBeCloseTo(190);
	});

	it("only averages across alternatives that contributed nutrition data", () => {
		// One alternative has nutrition (60), the other has none — averaging
		// across only the contributor gives 60, not 30.
		const result = getRecipeNutrition({
			ingredients: [
				makeIngredient({
					id: "i-x",
					productId: "p-x",
					quantity: "1",
					groupName: "Pick One",
				}),
				makeIngredient({
					id: "i-y",
					productId: "p-y",
					quantity: "1",
					groupName: "Pick One",
				}),
			],
			products: [
				makeProduct({ id: "p-x", calories: "60" }),
				// p-y has no nutrition data
				makeProduct({ id: "p-y" }),
			],
			unitConversions: [],
			scaleFactor: 1,
		});

		expect(result?.calories).toBeCloseTo(60);
	});
});
