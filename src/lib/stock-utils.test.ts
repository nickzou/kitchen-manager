import { describe, expect, it } from "vitest";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import {
	getAvgUnitCost,
	getLatestUnitCost,
	pickBestEntry,
} from "#src/lib/stock-utils";

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

describe("pickBestEntry", () => {
	it("returns null for empty array", () => {
		expect(pickBestEntry([])).toBeNull();
	});

	it("returns null when all entries have zero quantity", () => {
		const entries = [
			makeEntry({ id: "e1", quantity: "0" }),
			makeEntry({ id: "e2", quantity: "0" }),
		];
		expect(pickBestEntry(entries)).toBeNull();
	});

	it("filters out zero-quantity entries", () => {
		const entries = [
			makeEntry({ id: "e1", quantity: "0" }),
			makeEntry({ id: "e2", quantity: "3" }),
		];
		expect(pickBestEntry(entries)?.id).toBe("e2");
	});

	it("picks the soonest expiring entry", () => {
		const entries = [
			makeEntry({ id: "e1", expirationDate: "2026-03-20T00:00:00Z" }),
			makeEntry({ id: "e2", expirationDate: "2026-03-15T00:00:00Z" }),
			makeEntry({ id: "e3", expirationDate: "2026-03-25T00:00:00Z" }),
		];
		expect(pickBestEntry(entries)?.id).toBe("e2");
	});

	it("prefers entries with expiration dates over those without", () => {
		const entries = [
			makeEntry({ id: "e1", expirationDate: null }),
			makeEntry({ id: "e2", expirationDate: "2026-06-01T00:00:00Z" }),
		];
		expect(pickBestEntry(entries)?.id).toBe("e2");
	});

	it("sorts entries without expiration by purchaseDate ascending", () => {
		const entries = [
			makeEntry({ id: "e1", purchaseDate: "2026-02-10T00:00:00Z" }),
			makeEntry({ id: "e2", purchaseDate: "2026-01-05T00:00:00Z" }),
			makeEntry({ id: "e3", purchaseDate: "2026-03-01T00:00:00Z" }),
		];
		expect(pickBestEntry(entries)?.id).toBe("e2");
	});

	it("sorts by createdAt when purchaseDates are equal", () => {
		const entries = [
			makeEntry({
				id: "e1",
				purchaseDate: "2026-01-01T00:00:00Z",
				createdAt: "2026-01-02T00:00:00Z",
			}),
			makeEntry({
				id: "e2",
				purchaseDate: "2026-01-01T00:00:00Z",
				createdAt: "2026-01-01T00:00:00Z",
			}),
		];
		expect(pickBestEntry(entries)?.id).toBe("e2");
	});

	it("entries without purchaseDate sort after those with", () => {
		const entries = [
			makeEntry({ id: "e1", purchaseDate: null }),
			makeEntry({ id: "e2", purchaseDate: "2026-01-01T00:00:00Z" }),
		];
		expect(pickBestEntry(entries)?.id).toBe("e2");
	});

	it("returns the single available entry", () => {
		const entries = [makeEntry({ id: "e1", quantity: "1" })];
		expect(pickBestEntry(entries)?.id).toBe("e1");
	});

	it("handles mix of expiring and non-expiring entries", () => {
		const entries = [
			makeEntry({
				id: "e1",
				purchaseDate: "2025-12-01T00:00:00Z",
			}),
			makeEntry({
				id: "e2",
				expirationDate: "2026-04-01T00:00:00Z",
			}),
			makeEntry({
				id: "e3",
				expirationDate: "2026-03-01T00:00:00Z",
			}),
		];
		// e3 expires soonest
		expect(pickBestEntry(entries)?.id).toBe("e3");
	});
});

describe("getAvgUnitCost", () => {
	it("returns null for empty array", () => {
		expect(getAvgUnitCost([])).toBeNull();
	});

	it("returns null when no entries have a unitCost", () => {
		const entries = [makeEntry({ unitCost: null })];
		expect(getAvgUnitCost(entries)).toBeNull();
	});

	it("calculates unit cost for a single entry", () => {
		const entries = [makeEntry({ unitCost: "2.5" })];
		expect(getAvgUnitCost(entries)).toBe(2.5);
	});

	it("averages unit costs across multiple entries", () => {
		const entries = [
			makeEntry({ id: "e1", unitCost: "5" }),
			makeEntry({ id: "e2", unitCost: "3" }),
		];
		expect(getAvgUnitCost(entries)).toBe(4);
	});

	it("skips entries without a unitCost", () => {
		const entries = [
			makeEntry({ id: "e1", unitCost: "2" }),
			makeEntry({ id: "e2", unitCost: null }),
		];
		expect(getAvgUnitCost(entries)).toBe(2);
	});
});

describe("getLatestUnitCost", () => {
	it("returns null for empty array", () => {
		expect(getLatestUnitCost([])).toBeNull();
	});

	it("returns null when no entries have a unitCost", () => {
		const entries = [
			makeEntry({ unitCost: null, purchaseDate: "2026-01-01T00:00:00Z" }),
		];
		expect(getLatestUnitCost(entries)).toBeNull();
	});

	it("returns unit cost of the single entry with unitCost", () => {
		const entries = [
			makeEntry({
				unitCost: "5",
				purchaseDate: "2026-01-01T00:00:00Z",
			}),
		];
		expect(getLatestUnitCost(entries)).toBe(5);
	});

	it("returns unit cost from the most recent entry by purchaseDate", () => {
		const entries = [
			makeEntry({
				id: "e1",
				unitCost: "5",
				purchaseDate: "2026-01-01T00:00:00Z",
			}),
			makeEntry({
				id: "e2",
				unitCost: "3",
				purchaseDate: "2026-03-01T00:00:00Z",
			}),
			makeEntry({
				id: "e3",
				unitCost: "4",
				purchaseDate: "2026-02-01T00:00:00Z",
			}),
		];
		expect(getLatestUnitCost(entries)).toBe(3);
	});

	it("skips entries without a unitCost when finding latest", () => {
		const entries = [
			makeEntry({
				id: "e1",
				unitCost: "2",
				purchaseDate: "2026-01-01T00:00:00Z",
			}),
			makeEntry({
				id: "e2",
				unitCost: null,
				purchaseDate: "2026-03-01T00:00:00Z",
			}),
		];
		expect(getLatestUnitCost(entries)).toBe(2);
	});

	it("handles entries with null purchaseDate", () => {
		const entries = [
			makeEntry({
				id: "e1",
				unitCost: "5",
				purchaseDate: "2026-02-01T00:00:00Z",
			}),
			makeEntry({ id: "e2", unitCost: "2", purchaseDate: null }),
		];
		// e1 has a real date which is newer than epoch (null → 0)
		expect(getLatestUnitCost(entries)).toBe(5);
	});
});
