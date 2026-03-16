import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import { StockEntryRow } from "./StockEntryRow";

export function StockProductContent({
	entries,
	unitAbbr,
	consumeAmounts,
	onConsumeAmountChange,
	onConsume,
	consumePending,
	onEdit,
	storeNames,
	brandNames,
}: {
	entries: StockEntry[];
	unitAbbr: string;
	consumeAmounts: Record<string, string>;
	onConsumeAmountChange: (entryId: string, value: string) => void;
	onConsume: (entryId: string) => void;
	consumePending: boolean;
	onEdit: (entry: StockEntry) => void;
	storeNames: Record<string, string>;
	brandNames: Record<string, string>;
}) {
	if (entries.length === 0) {
		return (
			<p className="px-3 py-2 text-xs text-(--sea-ink-soft)">
				No stock entries
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			{entries.map((entry) => (
				<StockEntryRow
					key={entry.id}
					entry={entry}
					unitAbbr={unitAbbr}
					consumeAmount={consumeAmounts[entry.id] ?? "1"}
					onConsumeAmountChange={(value) =>
						onConsumeAmountChange(entry.id, value)
					}
					onConsume={() => onConsume(entry.id)}
					consumePending={consumePending}
					onEdit={() => onEdit(entry)}
					storeName={entry.storeId ? (storeNames[entry.storeId] ?? null) : null}
					brandName={entry.brandId ? (brandNames[entry.brandId] ?? null) : null}
				/>
			))}
		</div>
	);
}
