import { describe, expect, it } from "vitest";
import { buildConversionGraph } from "./conversion-graph";
import { formatConversion } from "./format-conversion";

const cupToGramGraph = buildConversionGraph([
	{ fromUnitId: "cup", toUnitId: "g", factor: "240" },
]);

const mlGraph = buildConversionGraph([
	{ fromUnitId: "cup", toUnitId: "ml", factor: "240" },
]);

describe("formatConversion", () => {
	it("returns null when fromUnitId is missing", () => {
		expect(
			formatConversion({
				quantity: 1,
				fromUnitId: null,
				toUnitId: "g",
				toUnitLabel: "g",
				graph: cupToGramGraph,
			}),
		).toBeNull();
	});

	it("returns null when toUnitId is missing", () => {
		expect(
			formatConversion({
				quantity: 1,
				fromUnitId: "cup",
				toUnitId: null,
				toUnitLabel: null,
				graph: cupToGramGraph,
			}),
		).toBeNull();
	});

	it("returns null when from and to units are the same", () => {
		expect(
			formatConversion({
				quantity: 200,
				fromUnitId: "g",
				toUnitId: "g",
				toUnitLabel: "g",
				graph: cupToGramGraph,
			}),
		).toBeNull();
	});

	it("returns null when quantity is zero or negative", () => {
		expect(
			formatConversion({
				quantity: 0,
				fromUnitId: "cup",
				toUnitId: "g",
				toUnitLabel: "g",
				graph: cupToGramGraph,
			}),
		).toBeNull();
	});

	it("returns null when no conversion path exists", () => {
		const disconnected = buildConversionGraph([]);
		expect(
			formatConversion({
				quantity: 2,
				fromUnitId: "cup",
				toUnitId: "g",
				toUnitLabel: "g",
				graph: disconnected,
			}),
		).toBeNull();
	});

	it("rounds grams to whole integers", () => {
		const result = formatConversion({
			quantity: 1,
			fromUnitId: "cup",
			toUnitId: "g",
			toUnitLabel: "g",
			graph: cupToGramGraph,
		});
		expect(result).toBe("≈ 240 g");
	});

	it("rounds millilitres to whole integers", () => {
		const result = formatConversion({
			quantity: 1,
			fromUnitId: "cup",
			toUnitId: "ml",
			toUnitLabel: "mL",
			graph: mlGraph,
		});
		expect(result).toBe("≈ 240 mL");
	});

	it("applies scaled quantities correctly (2 cups = 480 g)", () => {
		expect(
			formatConversion({
				quantity: 2,
				fromUnitId: "cup",
				toUnitId: "g",
				toUnitLabel: "g",
				graph: cupToGramGraph,
			}),
		).toBe("≈ 480 g");
	});

	it("uses one decimal for kg", () => {
		const kgGraph = buildConversionGraph([
			{ fromUnitId: "lb", toUnitId: "kg", factor: "0.4536" },
		]);
		expect(
			formatConversion({
				quantity: 5,
				fromUnitId: "lb",
				toUnitId: "kg",
				toUnitLabel: "kg",
				graph: kgGraph,
			}),
		).toBe("≈ 2.3 kg");
	});

	it("uses one decimal for litres", () => {
		const lGraph = buildConversionGraph([
			{ fromUnitId: "cup", toUnitId: "L", factor: "0.24" },
		]);
		expect(
			formatConversion({
				quantity: 5,
				fromUnitId: "cup",
				toUnitId: "L",
				toUnitLabel: "L",
				graph: lGraph,
			}),
		).toBe("≈ 1.2 L");
	});

	it("handles two-decimal rendering for sub-1 fractional units", () => {
		// 1 tsp = 0.02 cup
		const teaspoonGraph = buildConversionGraph([
			{ fromUnitId: "tsp", toUnitId: "cup", factor: "0.0208" },
		]);
		const result = formatConversion({
			quantity: 1,
			fromUnitId: "tsp",
			toUnitId: "cup",
			toUnitLabel: "cup",
			graph: teaspoonGraph,
		});
		// 1 * 0.0208 = 0.0208 → rounded to 2dp = "0.02"
		expect(result).toBe("≈ 0.02 cup");
	});

	it("omits trailing zeros for nice round numbers", () => {
		const ouncesGraph = buildConversionGraph([
			{ fromUnitId: "cup", toUnitId: "oz", factor: "8" },
		]);
		expect(
			formatConversion({
				quantity: 1,
				fromUnitId: "cup",
				toUnitId: "oz",
				toUnitLabel: "oz",
				graph: ouncesGraph,
			}),
		).toBe("≈ 8 oz");
	});
});
