import type { StockEntry } from "#src/lib/hooks/use-stock-entries";

/**
 * Sort positive-quantity entries by the order they should be consumed in:
 * 1. Entries with an expiration date come before those without.
 * 2. Among entries with expirations, soonest expiry wins.
 * 3. Among entries without expirations, oldest purchaseDate, then oldest createdAt.
 */
export function sortByConsumePriority(entries: StockEntry[]): StockEntry[] {
	return [...entries]
		.filter((e) => Number.parseFloat(e.quantity) > 0)
		.sort((a, b) => {
			const aExp = a.expirationDate
				? new Date(a.expirationDate).getTime()
				: null;
			const bExp = b.expirationDate
				? new Date(b.expirationDate).getTime()
				: null;

			if (aExp !== null && bExp !== null) return aExp - bExp;
			if (aExp !== null) return -1;
			if (bExp !== null) return 1;

			const aPurch = a.purchaseDate
				? new Date(a.purchaseDate).getTime()
				: Number.POSITIVE_INFINITY;
			const bPurch = b.purchaseDate
				? new Date(b.purchaseDate).getTime()
				: Number.POSITIVE_INFINITY;
			if (aPurch !== bPurch) return aPurch - bPurch;

			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		});
}

export function pickBestEntry(entries: StockEntry[]): StockEntry | null {
	return sortByConsumePriority(entries)[0] ?? null;
}

/**
 * Walk through entries in consume-priority order, draining each until the
 * requested amount is satisfied. Returns the per-entry breakdown plus a
 * `complete` flag indicating whether the full amount could be allocated.
 */
export function planConsumption(
	entries: StockEntry[],
	neededAmount: number,
): {
	steps: { entryId: string; amount: number }[];
	totalPlanned: number;
	complete: boolean;
} {
	const sorted = sortByConsumePriority(entries);
	const steps: { entryId: string; amount: number }[] = [];
	let remaining = neededAmount;

	for (const entry of sorted) {
		if (remaining <= 0) break;
		const available = Number.parseFloat(entry.quantity);
		if (available <= 0) continue;
		const take = Math.min(available, remaining);
		steps.push({ entryId: entry.id, amount: take });
		remaining -= take;
	}

	const totalPlanned = neededAmount - remaining;
	return { steps, totalPlanned, complete: remaining <= 0 };
}

export function getAvgUnitCost(
	entries: Pick<StockEntry, "unitCost">[],
): number | null {
	const costs = entries
		.filter((e) => e.unitCost !== null)
		.map((e) => Number.parseFloat(e.unitCost as string));
	if (costs.length === 0) return null;
	return costs.reduce((sum, c) => sum + c, 0) / costs.length;
}

export function getLatestUnitCost(
	entries: Pick<StockEntry, "unitCost" | "purchaseDate">[],
): number | null {
	const priced = entries.filter((e) => e.unitCost !== null);
	if (priced.length === 0) return null;
	const latest = [...priced].sort(
		(a, b) =>
			new Date(b.purchaseDate ?? 0).getTime() -
			new Date(a.purchaseDate ?? 0).getTime(),
	)[0];
	return Number.parseFloat(latest.unitCost as string);
}
