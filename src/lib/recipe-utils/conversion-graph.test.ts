import { describe, expect, it } from "vitest";
import { buildConversionGraph, tryConvert } from "./conversion-graph";

describe("buildConversionGraph", () => {
	it("returns empty graph for empty input", () => {
		const graph = buildConversionGraph([]);
		expect(graph.size).toBe(0);
	});

	it("creates both directions for a single conversion", () => {
		const graph = buildConversionGraph([
			{ fromUnitId: "kg", toUnitId: "g", factor: 1000 },
		]);
		expect(graph.get("kg")?.get("g")).toBe(1000);
		expect(graph.get("g")?.get("kg")).toBe(1 / 1000);
	});

	it("handles multiple conversions", () => {
		const graph = buildConversionGraph([
			{ fromUnitId: "kg", toUnitId: "g", factor: 1000 },
			{ fromUnitId: "l", toUnitId: "ml", factor: 1000 },
		]);
		expect(graph.size).toBe(4);
		expect(graph.get("kg")?.get("g")).toBe(1000);
		expect(graph.get("l")?.get("ml")).toBe(1000);
	});

	it("accepts string factors", () => {
		const graph = buildConversionGraph([
			{ fromUnitId: "kg", toUnitId: "g", factor: "1000" },
		]);
		expect(graph.get("kg")?.get("g")).toBe(1000);
	});

	it("later conversions override earlier ones for the same pair", () => {
		const graph = buildConversionGraph([
			{ fromUnitId: "cup", toUnitId: "ml", factor: 240 },
			{ fromUnitId: "cup", toUnitId: "ml", factor: 250 },
		]);
		expect(graph.get("cup")?.get("ml")).toBe(250);
		expect(graph.get("ml")?.get("cup")).toBe(1 / 250);
	});
});

describe("tryConvert", () => {
	const graph = buildConversionGraph([
		{ fromUnitId: "kg", toUnitId: "g", factor: 1000 },
	]);

	it("returns qty when units are the same", () => {
		expect(tryConvert(graph, 5, "kg", "kg")).toBe(5);
	});

	it("returns qty when both units are null", () => {
		expect(tryConvert(graph, 5, null, null)).toBe(5);
	});

	it("returns null when fromUnitId is null and toUnitId is not", () => {
		expect(tryConvert(graph, 5, null, "g")).toBeNull();
	});

	it("returns null when toUnitId is null and fromUnitId is not", () => {
		expect(tryConvert(graph, 5, "kg", null)).toBeNull();
	});

	it("converts forward direction", () => {
		expect(tryConvert(graph, 2, "kg", "g")).toBe(2000);
	});

	it("converts reverse direction", () => {
		expect(tryConvert(graph, 500, "g", "kg")).toBeCloseTo(0.5);
	});

	it("returns null for missing conversion", () => {
		expect(tryConvert(graph, 5, "kg", "ml")).toBeNull();
	});
});
