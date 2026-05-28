import { describe, expect, it } from "vitest";
import { buildConversionGraph } from "./conversion-graph";
import { deriveProductCost } from "./derive-product-cost";

const emptyGraph = buildConversionGraph([]);
const graphFor = () => emptyGraph;

describe("deriveProductCost", () => {
	it("returns null when the recipe has no produced quantity", () => {
		expect(
			deriveProductCost({
				recipe: { producedQuantity: null, producedQuantityUnitId: "g" },
				ingredients: [],
				products: new Map(),
				graphFor,
			}),
		).toBe(null);
	});

	it("returns null when no ingredients are priced", () => {
		expect(
			deriveProductCost({
				recipe: { producedQuantity: "100", producedQuantityUnitId: "g" },
				ingredients: [{ productId: "p1", quantity: "50", quantityUnitId: "g" }],
				products: new Map([
					["p1", { defaultQuantityUnitId: "g", avgUnitCost: null }],
				]),
				graphFor,
			}),
		).toBe(null);
	});

	it("sums priced ingredients into a per-batch total", () => {
		const result = deriveProductCost({
			recipe: { producedQuantity: "100", producedQuantityUnitId: "g" },
			ingredients: [
				{ productId: "p1", quantity: "50", quantityUnitId: "g" },
				{ productId: "p2", quantity: "10", quantityUnitId: "g" },
			],
			products: new Map([
				["p1", { defaultQuantityUnitId: "g", avgUnitCost: 0.02 }],
				["p2", { defaultQuantityUnitId: "g", avgUnitCost: 0.5 }],
			]),
			graphFor,
		});

		expect(result).toEqual({
			total: 50 * 0.02 + 10 * 0.5,
			baseAmount: 100,
			baseUnitId: "g",
			complete: true,
		});
	});

	it("marks complete=false when an ingredient is unpriced", () => {
		const result = deriveProductCost({
			recipe: { producedQuantity: "100", producedQuantityUnitId: "g" },
			ingredients: [
				{ productId: "p1", quantity: "50", quantityUnitId: "g" },
				{ productId: "p2", quantity: "10", quantityUnitId: "g" },
			],
			products: new Map([
				["p1", { defaultQuantityUnitId: "g", avgUnitCost: 0.02 }],
				["p2", { defaultQuantityUnitId: "g", avgUnitCost: null }],
			]),
			graphFor,
		});

		expect(result?.complete).toBe(false);
		expect(result?.total).toBe(50 * 0.02);
	});
});
