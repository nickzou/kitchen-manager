import { describe, expect, it } from "vitest";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import { getStockTotals } from "./get-stock-totals";

function makeEntry(overrides: Partial<StockEntry> = {}): StockEntry {
	return {
		id: "e1",
		productId: "p1",
		quantity: "5",
		expirationDate: null,
		purchaseDate: null,
		price: null,
		unitCost: null,
		storeId: null,
		brandId: null,
		userId: "u1",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("getStockTotals", () => {
	it("returns an empty map for no entries", () => {
		expect(getStockTotals([])).toEqual(new Map());
	});

	it("returns a single product total", () => {
		const entries = [makeEntry({ quantity: "10" })];
		const result = getStockTotals(entries);
		expect(result.get("p1")).toBe(10);
		expect(result.size).toBe(1);
	});

	it("sums multiple entries for the same product", () => {
		const entries = [
			makeEntry({ id: "e1", quantity: "5" }),
			makeEntry({ id: "e2", quantity: "3" }),
			makeEntry({ id: "e3", quantity: "7" }),
		];
		const result = getStockTotals(entries);
		expect(result.get("p1")).toBe(15);
		expect(result.size).toBe(1);
	});

	it("groups totals by product", () => {
		const entries = [
			makeEntry({ id: "e1", productId: "p1", quantity: "4" }),
			makeEntry({ id: "e2", productId: "p2", quantity: "6" }),
			makeEntry({ id: "e3", productId: "p1", quantity: "2" }),
		];
		const result = getStockTotals(entries);
		expect(result.get("p1")).toBe(6);
		expect(result.get("p2")).toBe(6);
		expect(result.size).toBe(2);
	});

	it("handles decimal quantities", () => {
		const entries = [
			makeEntry({ id: "e1", quantity: "1.5" }),
			makeEntry({ id: "e2", quantity: "2.75" }),
		];
		const result = getStockTotals(entries);
		expect(result.get("p1")).toBeCloseTo(4.25);
	});
});
