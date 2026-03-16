import type { StockEntry } from "#src/lib/hooks/use-stock-entries";

export function pickBestEntry(entries: StockEntry[]): StockEntry | null {
	const available = entries.filter((e) => Number.parseFloat(e.quantity) > 0);
	if (available.length === 0) return null;

	return available.sort((a, b) => {
		const aExp = a.expirationDate ? new Date(a.expirationDate).getTime() : null;
		const bExp = b.expirationDate ? new Date(b.expirationDate).getTime() : null;

		// Entries with expiration dates come first
		if (aExp !== null && bExp !== null) return aExp - bExp;
		if (aExp !== null) return -1;
		if (bExp !== null) return 1;

		// Both have no expiration: sort by purchaseDate, then createdAt
		const aPurch = a.purchaseDate
			? new Date(a.purchaseDate).getTime()
			: Number.POSITIVE_INFINITY;
		const bPurch = b.purchaseDate
			? new Date(b.purchaseDate).getTime()
			: Number.POSITIVE_INFINITY;
		if (aPurch !== bPurch) return aPurch - bPurch;

		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	})[0];
}

export function getAvgUnitCost(
	entries: Pick<StockEntry, "price" | "quantity">[],
): number | null {
	const costs = entries
		.filter((e) => e.price && Number.parseFloat(e.quantity) > 0)
		.map((e) => Number.parseFloat(e.price!) / Number.parseFloat(e.quantity));
	if (costs.length === 0) return null;
	return costs.reduce((sum, c) => sum + c, 0) / costs.length;
}

export function getLatestUnitCost(
	entries: Pick<StockEntry, "price" | "quantity" | "purchaseDate">[],
): number | null {
	const priced = entries.filter(
		(e) => e.price && Number.parseFloat(e.quantity) > 0,
	);
	if (priced.length === 0) return null;
	const latest = [...priced].sort(
		(a, b) =>
			new Date(b.purchaseDate ?? 0).getTime() -
			new Date(a.purchaseDate ?? 0).getTime(),
	)[0];
	return Number.parseFloat(latest.price!) / Number.parseFloat(latest.quantity);
}
