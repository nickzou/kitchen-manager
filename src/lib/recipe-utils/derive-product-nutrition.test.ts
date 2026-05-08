import { describe, expect, it } from "vitest";
import { buildConversionGraph } from "./conversion-graph";
import {
	deriveProductNutrition,
	type ProductForNutrition,
} from "./derive-product-nutrition";

const graph = buildConversionGraph([
	{ fromUnitId: "g", toUnitId: "ml", factor: 1 }, // unrelated; just to populate
]);
const graphFor = () => graph;

function product(overrides: Partial<ProductForNutrition>): ProductForNutrition {
	return {
		defaultQuantityUnitId: "g",
		nutritionBaseAmount: "100",
		nutritionBaseUnitId: "g",
		calories: null,
		protein: null,
		fat: null,
		carbs: null,
		...overrides,
	};
}

describe("deriveProductNutrition", () => {
	it("returns null when recipe has no produced quantity", () => {
		const result = deriveProductNutrition({
			recipe: { producedQuantity: null, producedQuantityUnitId: "g" },
			ingredients: [],
			products: new Map(),
			graphFor,
		});
		expect(result).toBeNull();
	});

	it("returns null when recipe has no produced unit", () => {
		const result = deriveProductNutrition({
			recipe: { producedQuantity: "100", producedQuantityUnitId: null },
			ingredients: [],
			products: new Map(),
			graphFor,
		});
		expect(result).toBeNull();
	});

	it("sums ingredient macros and reports per produced quantity", () => {
		const products = new Map<string, ProductForNutrition>([
			[
				"flour",
				product({
					calories: "364", // per 100 g
					protein: "10",
					fat: "1",
					carbs: "76",
				}),
			],
			[
				"sugar",
				product({
					calories: "387", // per 100 g
					protein: "0",
					fat: "0",
					carbs: "100",
				}),
			],
		]);
		const result = deriveProductNutrition({
			recipe: { producedQuantity: "500", producedQuantityUnitId: "g" },
			ingredients: [
				{ productId: "flour", quantity: "200", quantityUnitId: "g" },
				{ productId: "sugar", quantity: "100", quantityUnitId: "g" },
			],
			products,
			graphFor,
		});
		expect(result).not.toBeNull();
		// 364 * 2 + 387 = 728 + 387 = 1115 cal across the whole batch
		expect(result?.calories).toBeCloseTo(1115);
		expect(result?.baseAmount).toBe(500);
		expect(result?.baseUnitId).toBe("g");
		expect(result?.complete).toBe(true);
	});

	it("treats ingredients with no macros as zero contribution and stays complete", () => {
		const products = new Map<string, ProductForNutrition>([
			["water", product({})], // all macros null
			[
				"flour",
				product({ calories: "364", protein: "10", fat: "1", carbs: "76" }),
			],
		]);
		const result = deriveProductNutrition({
			recipe: { producedQuantity: "1000", producedQuantityUnitId: "g" },
			ingredients: [
				{ productId: "water", quantity: "500", quantityUnitId: "g" },
				{ productId: "flour", quantity: "100", quantityUnitId: "g" },
			],
			products,
			graphFor,
		});
		expect(result?.calories).toBeCloseTo(364);
		expect(result?.complete).toBe(true);
	});

	it("flags incomplete when an ingredient unit cannot be converted", () => {
		// flour has nutrition base in grams; ingredient quantity is in tsp with
		// no conversion in the graph — contribution is skipped and the result
		// is flagged incomplete.
		const products = new Map<string, ProductForNutrition>([
			[
				"flour",
				product({ calories: "364", protein: "10", fat: "1", carbs: "76" }),
			],
		]);
		const emptyGraph = buildConversionGraph([]);
		const result = deriveProductNutrition({
			recipe: { producedQuantity: "500", producedQuantityUnitId: "g" },
			ingredients: [
				{ productId: "flour", quantity: "2", quantityUnitId: "tsp" },
			],
			products,
			graphFor: () => emptyGraph,
		});
		expect(result).not.toBeNull();
		expect(result?.complete).toBe(false);
		expect(result?.calories).toBe(0);
	});

	it("flags incomplete when an ingredient's product is missing", () => {
		const result = deriveProductNutrition({
			recipe: { producedQuantity: "500", producedQuantityUnitId: "g" },
			ingredients: [
				{ productId: "ghost", quantity: "100", quantityUnitId: "g" },
			],
			products: new Map(),
			graphFor,
		});
		expect(result?.complete).toBe(false);
	});
});
