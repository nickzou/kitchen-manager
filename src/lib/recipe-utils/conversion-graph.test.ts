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

describe("tryConvert multi-hop", () => {
	it("composes through one shared intermediate (tsp → g → jar)", () => {
		const g = buildConversionGraph([
			{ fromUnitId: "tsp", toUnitId: "g", factor: 6 }, // 1 tsp = 6 g
			{ fromUnitId: "jar", toUnitId: "g", factor: 250 }, // 1 jar = 250 g
		]);
		// 0.5 tsp → 3 g → 3/250 jar = 0.012 jar
		expect(tryConvert(g, 0.5, "tsp", "jar")).toBeCloseTo(0.012);
	});

	it("composes through a chain of three hops", () => {
		// A→B (×2), B→C (×3), C→D (×5) → A→D (×30)
		const g = buildConversionGraph([
			{ fromUnitId: "A", toUnitId: "B", factor: 2 },
			{ fromUnitId: "B", toUnitId: "C", factor: 3 },
			{ fromUnitId: "C", toUnitId: "D", factor: 5 },
		]);
		expect(tryConvert(g, 1, "A", "D")).toBeCloseTo(30);
	});

	it("works the other direction through a chain", () => {
		const g = buildConversionGraph([
			{ fromUnitId: "tsp", toUnitId: "g", factor: 6 },
			{ fromUnitId: "jar", toUnitId: "g", factor: 250 },
		]);
		// 1 jar → 250 g → 250/6 tsp ≈ 41.667 tsp
		expect(tryConvert(g, 1, "jar", "tsp")).toBeCloseTo(250 / 6);
	});

	it("round-trips through a chain back to the original quantity", () => {
		const g = buildConversionGraph([
			{ fromUnitId: "tsp", toUnitId: "g", factor: 6 },
			{ fromUnitId: "jar", toUnitId: "g", factor: 250 },
		]);
		const tspToJar = tryConvert(g, 0.5, "tsp", "jar");
		expect(tspToJar).not.toBeNull();
		const back = tryConvert(g, tspToJar!, "jar", "tsp");
		expect(back).toBeCloseTo(0.5);
	});

	it("returns null when no path exists between disconnected components", () => {
		const g = buildConversionGraph([
			{ fromUnitId: "tsp", toUnitId: "g", factor: 6 },
			{ fromUnitId: "ml", toUnitId: "L", factor: 0.001 },
		]);
		expect(tryConvert(g, 1, "tsp", "L")).toBeNull();
	});

	it("does not loop on cycles in the graph", () => {
		// A→B→C→A forms a cycle plus a separate D
		const g = buildConversionGraph([
			{ fromUnitId: "A", toUnitId: "B", factor: 2 },
			{ fromUnitId: "B", toUnitId: "C", factor: 3 },
			{ fromUnitId: "C", toUnitId: "A", factor: 1 / 6 },
			{ fromUnitId: "C", toUnitId: "D", factor: 4 },
		]);
		expect(tryConvert(g, 1, "A", "D")).toBeCloseTo(2 * 3 * 4);
		expect(tryConvert(g, 1, "D", "A")).toBeCloseTo(1 / (2 * 3 * 4));
	});

	it("picks the shortest path when multiple exist (BFS)", () => {
		// A→B (×10), A→C (×100), B→D (×1), C→D (×0.1) — both end at D=10
		// Shortest path A→B→D = ×10. Long path A→C→D = ×10 also. Same value
		// here, but ensure BFS doesn't take a longer path that drifts more.
		const g = buildConversionGraph([
			{ fromUnitId: "A", toUnitId: "B", factor: 10 },
			{ fromUnitId: "A", toUnitId: "C", factor: 100 },
			{ fromUnitId: "B", toUnitId: "D", factor: 1 },
			{ fromUnitId: "C", toUnitId: "D", factor: 0.1 },
		]);
		expect(tryConvert(g, 1, "A", "D")).toBeCloseTo(10);
	});
});
