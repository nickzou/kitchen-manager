import type { StockEntry } from "#src/lib/hooks/use-stock-entries";

export function getStockTotals(
	stockEntries: StockEntry[],
): Map<string, number> {
	const totals = new Map<string, number>();
	for (const entry of stockEntries) {
		const prev = totals.get(entry.productId) ?? 0;
		totals.set(entry.productId, prev + Number(entry.quantity));
	}
	return totals;
}
