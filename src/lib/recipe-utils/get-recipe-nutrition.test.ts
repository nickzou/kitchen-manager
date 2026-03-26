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
		defaultExpirationDays: null,
		defaultConsumeAmount: null,
		calories: null,
		protein: null,
		fat: null,
		carbs: null,
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
});
