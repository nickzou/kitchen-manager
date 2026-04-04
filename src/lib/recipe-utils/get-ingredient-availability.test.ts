import { describe, expect, it } from "vitest";
import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { getIngredientAvailability } from "./get-ingredient-availability";

function makeProduct(overrides: Partial<Product> = {}): Product {
	return {
		id: "p1",
		name: "Flour",
		categoryIds: [],
		description: null,
		image: null,
		defaultQuantityUnitId: "g",
		minStockAmount: "0",
		isFood: true,
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
	productConversions: [] as {
		productId: string;
		fromUnitId: string;
		toUnitId: string;
		factor: string;
	}[],
	scaleFactor: 1,
};

describe("getIngredientAvailability", () => {
	it("returns empty map for empty ingredients", () => {
		const result = getIngredientAvailability({
			ingredients: [],
			products: [],
			stockEntries: [],
			...defaults,
		});
		expect(result.size).toBe(0);
	});

	it("returns 'sufficient' when stock exceeds needed quantity", () => {
		const result = getIngredientAvailability({
			ingredients: [makeIngredient({ quantity: "500", quantityUnitId: "g" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000" })],
			...defaults,
		});
		expect(result.get("i1")).toBe("sufficient");
	});

	it("returns 'deficit' when stock is less than needed quantity", () => {
		const result = getIngredientAvailability({
			ingredients: [makeIngredient({ quantity: "500", quantityUnitId: "g" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "100" })],
			...defaults,
		});
		expect(result.get("i1")).toBe("deficit");
	});

	it("returns 'unknown' when unit conversion is unavailable", () => {
		const result = getIngredientAvailability({
			ingredients: [makeIngredient({ quantity: "2", quantityUnitId: "cups" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000" })],
			...defaults,
		});
		expect(result.get("i1")).toBe("unknown");
	});

	it("applies scale factor correctly", () => {
		// 500g needed * scaleFactor 3 = 1500g needed, stock is 1000g → deficit
		const result = getIngredientAvailability({
			ingredients: [makeIngredient({ quantity: "500", quantityUnitId: "g" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000" })],
			unitConversions: [],
			productConversions: [],
			scaleFactor: 3,
		});
		expect(result.get("i1")).toBe("deficit");
	});

	it("applies scale factor — sufficient when stock covers scaled amount", () => {
		// 500g * 2 = 1000g needed, stock is 1000g → sufficient
		const result = getIngredientAvailability({
			ingredients: [makeIngredient({ quantity: "500", quantityUnitId: "g" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000" })],
			unitConversions: [],
			productConversions: [],
			scaleFactor: 2,
		});
		expect(result.get("i1")).toBe("sufficient");
	});

	it("uses product-specific conversions to override global", () => {
		// Global: no conversion for cups→g
		// Product-specific: cups→g factor 240 for product p1
		// 2 cups * 240 = 480g needed, stock is 1000g → sufficient
		const result = getIngredientAvailability({
			ingredients: [makeIngredient({ quantity: "2", quantityUnitId: "cups" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000" })],
			unitConversions: [],
			productConversions: [
				{
					productId: "p1",
					fromUnitId: "cups",
					toUnitId: "g",
					factor: "240",
				},
			],
			scaleFactor: 1,
		});
		expect(result.get("i1")).toBe("sufficient");
	});

	it("skips ingredients without productId", () => {
		const result = getIngredientAvailability({
			ingredients: [makeIngredient({ productId: null })],
			products: [makeProduct()],
			stockEntries: [makeEntry()],
			...defaults,
		});
		expect(result.size).toBe(0);
	});

	it("converts units using global conversion graph", () => {
		// ingredient: 0.5 kg, product default: g, conversion: kg→g = 1000
		// 0.5 * 1000 = 500g needed, stock is 1000g → sufficient
		const result = getIngredientAvailability({
			ingredients: [makeIngredient({ quantity: "0.5", quantityUnitId: "kg" })],
			products: [makeProduct({ defaultQuantityUnitId: "g" })],
			stockEntries: [makeEntry({ quantity: "1000" })],
			unitConversions: [
				makeConversion({ fromUnitId: "kg", toUnitId: "g", factor: "1000" }),
			],
			productConversions: [],
			scaleFactor: 1,
		});
		expect(result.get("i1")).toBe("sufficient");
	});
});
