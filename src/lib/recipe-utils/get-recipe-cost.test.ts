import { describe, expect, it } from "vitest";
import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { getRecipeCost } from "./get-recipe-cost";

function makeProduct(overrides: Partial<Product> = {}): Product {
	return {
		id: "p1",
		name: "Flour",
		categoryIds: [],
		description: null,
		image: null,
		defaultQuantityUnitId: "g",
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
		quantity: "500",
		quantityUnitId: "g",
		notes: null,
		groupName: null,
		sortOrder: 0,
		userId: "u1",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function makeEntry(overrides: Partial<StockEntry> = {}): StockEntry {
	return {
		id: "e1",
		productId: "p1",
		quantity: "1000",
		expirationDate: null,
		purchaseDate: null,
		price: "5.00",
		unitCost: "0.005",
		storeId: null,
		brandId: null,
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
		fromUnitId: "kg",
		toUnitId: "g",
		factor: "1000",
		userId: "u1",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

const defaults = {
	unitConversions: [] as UnitConversion[],
	scaleFactor: 1,
};

describe("getRecipeCost", () => {
	it("returns null for empty ingredients", () => {
		const result = getRecipeCost({
			ingredients: [],
			products: [],
			stockEntries: [],
			...defaults,
		});
		expect(result).toBeNull();
	});

	it("returns null when no ingredients can be priced", () => {
		const result = getRecipeCost({
			ingredients: [makeIngredient()],
			products: [makeProduct()],
			stockEntries: [makeEntry({ price: null, unitCost: null })],
			...defaults,
		});
		expect(result).toBeNull();
	});

	it("computes cost for a single ingredient with same units", () => {
		// 1000g of flour costs $5.00 → avg cost = $0.005/g
		// ingredient needs 500g → cost = 500 * 0.005 = $2.50
		const result = getRecipeCost({
			ingredients: [makeIngredient({ quantity: "500", quantityUnitId: "g" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000", price: "5.00" })],
			...defaults,
		});
		expect(result).not.toBeNull();
		expect(result!.total).toBeCloseTo(2.5);
		expect(result!.ingredientsPriced).toBe(1);
		expect(result!.ingredientsTotal).toBe(1);
	});

	it("applies scale factor", () => {
		const result = getRecipeCost({
			ingredients: [makeIngredient({ quantity: "500", quantityUnitId: "g" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000", price: "5.00" })],
			unitConversions: [],
			scaleFactor: 2,
		});
		expect(result!.total).toBeCloseTo(5.0);
	});

	it("converts units using the conversion graph", () => {
		// stock: 1000g at $5.00 → $0.005/g
		// ingredient: 0.5 kg → needs conversion kg→g
		// 0.5 * 1000 = 500g → 500 * 0.005 = $2.50
		const result = getRecipeCost({
			ingredients: [makeIngredient({ quantity: "0.5", quantityUnitId: "kg" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000", price: "5.00" })],
			unitConversions: [
				makeConversion({ fromUnitId: "kg", toUnitId: "g", factor: "1000" }),
			],
			scaleFactor: 1,
		});
		expect(result!.total).toBeCloseTo(2.5);
	});

	it("uses reverse conversion when only the inverse is defined", () => {
		// conversion defined: g→kg (factor 0.001)
		// ingredient is in kg, product default is g → needs kg→g
		// reverse: 1/0.001 = 1000
		const result = getRecipeCost({
			ingredients: [makeIngredient({ quantity: "0.5", quantityUnitId: "kg" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000", price: "5.00" })],
			unitConversions: [
				makeConversion({ fromUnitId: "g", toUnitId: "kg", factor: "0.001" }),
			],
			scaleFactor: 1,
		});
		expect(result!.total).toBeCloseTo(2.5);
	});

	it("skips ingredients with no matching product", () => {
		const result = getRecipeCost({
			ingredients: [makeIngredient({ productId: "missing" })],
			products: [makeProduct({ id: "p1" })],
			stockEntries: [makeEntry()],
			...defaults,
		});
		expect(result).toBeNull();
	});

	it("skips ingredients with null productId", () => {
		const result = getRecipeCost({
			ingredients: [makeIngredient({ productId: null })],
			products: [makeProduct()],
			stockEntries: [makeEntry()],
			...defaults,
		});
		expect(result).toBeNull();
	});

	it("skips ingredients when unit conversion is unavailable", () => {
		const result = getRecipeCost({
			ingredients: [makeIngredient({ quantityUnitId: "cups" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry()],
			unitConversions: [],
			scaleFactor: 1,
		});
		expect(result).toBeNull();
	});

	it("reports partial pricing when some ingredients can be priced", () => {
		const result = getRecipeCost({
			ingredients: [
				makeIngredient({
					id: "i1",
					productId: "p1",
					quantity: "500",
					quantityUnitId: "g",
				}),
				makeIngredient({
					id: "i2",
					productId: "p2",
					quantity: "2",
					quantityUnitId: "cups",
				}),
			],
			products: [
				makeProduct({ id: "p1", defaultQuantityUnitId: "g" }),
				makeProduct({ id: "p2", defaultQuantityUnitId: "ml" }),
			],
			stockEntries: [
				makeEntry({
					id: "e1",
					productId: "p1",
					quantity: "1000",
					price: "5.00",
				}),
				makeEntry({
					id: "e2",
					productId: "p2",
					quantity: "500",
					price: "3.00",
					unitCost: "0.006",
				}),
			],
			unitConversions: [],
			scaleFactor: 1,
		});
		// Only p1 can be priced (same unit), p2 needs cups→ml conversion which doesn't exist
		expect(result).not.toBeNull();
		expect(result!.ingredientsPriced).toBe(1);
		expect(result!.ingredientsTotal).toBe(2);
		expect(result!.total).toBeCloseTo(2.5);
	});

	it("averages cost across multiple stock entries", () => {
		// entry1: 1000g at $4.00 → $0.004/g
		// entry2: 500g at $3.00 → $0.006/g
		// avg unit cost = ($0.004 + $0.006) / 2 = $0.005/g
		// 500g * $0.005 = $2.50
		const result = getRecipeCost({
			ingredients: [makeIngredient({ quantity: "500", quantityUnitId: "g" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [
				makeEntry({
					id: "e1",
					quantity: "1000",
					price: "4.00",
					unitCost: "0.004",
				}),
				makeEntry({
					id: "e2",
					quantity: "500",
					price: "3.00",
					unitCost: "0.006",
				}),
			],
			...defaults,
		});
		expect(result!.total).toBeCloseTo(2.5);
	});
});
