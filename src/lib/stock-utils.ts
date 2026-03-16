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
