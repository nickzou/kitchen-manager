import { describe, expect, it } from "vitest";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import { pickBestEntry } from "#src/lib/stock-utils";

function makeEntry(overrides: Partial<StockEntry> = {}): StockEntry {
	return {
		id: "e1",
		productId: "p1",
		quantity: "5",
		expirationDate: null,
		purchaseDate: null,
		price: null,
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
