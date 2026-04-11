import { Pencil, Skull, Trash2, UtensilsCrossed } from "lucide-react";
import { NumberInput } from "#src/components/NumberInput";
import { AmberButton } from "#src/components/stock/AmberButton";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";

export function StockEntryRow({
	entry,
	unitAbbr,
	consumeAmount,
	onConsumeAmountChange,
	onConsume,
	onConsumeAll,
	consumePending,
	onEdit,
	onDelete,
	deletePending,
	onSpoil,
	onSpoilAll,
	spoilPending,
	storeName,
	brandName,
}: {
	entry: StockEntry;
	unitAbbr: string;
	consumeAmount: string;
	onConsumeAmountChange: (value: string) => void;
	onConsume: () => void;
	onConsumeAll: () => void;
	consumePending: boolean;
	onEdit: () => void;
	onDelete: () => void;
	deletePending: boolean;
	onSpoil: () => void;
	onSpoilAll: () => void;
	spoilPending: boolean;
	storeName: string | null;
	brandName: string | null;
}) {
	return (
		<div className="flex flex-col gap-2 rounded-lg bg-(--surface) pl-3 py-2 text-xs text-(--sea-ink-soft) sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:pl-3 sm:pr-0">
			<div className="flex flex-wrap items-center gap-2 sm:contents">
				<span className="font-medium text-(--sea-ink)">
					{entry.quantity}
					{unitAbbr ? ` ${unitAbbr}` : ""}
				</span>
				{entry.expirationDate && (
					<span>
						Exp: {new Date(entry.expirationDate).toLocaleDateString()}
					</span>
				)}
				{entry.purchaseDate && (
					<span>
						Purchased: {new Date(entry.purchaseDate).toLocaleDateString()}
					</span>
				)}
				{entry.price && <span>${entry.price}</span>}
				{brandName && <span>{brandName}</span>}
				{storeName && <span>{storeName}</span>}
			</div>
			<div className="flex items-center gap-1.5 sm:ml-auto">
				<NumberInput
					placeholder="Qty"
					step="any"
					min="0.01"
					max={entry.quantity}
					value={consumeAmount}
					onChange={(e) => onConsumeAmountChange(e.target.value)}
					className="h-7 flex-1 rounded border bg-white px-2 text-xs sm:w-20 sm:flex-none dark:bg-(--surface)"
				/>
				<button
					type="button"
					onClick={onEdit}
					className="flex h-7 w-7 items-center justify-center rounded-full border border-(--line) text-xs font-semibold text-(--sea-ink-soft) transition hover:bg-(--line) sm:w-auto sm:gap-1 sm:px-2.5"
				>
					<Pencil size={12} />
				</button>
				<button
					type="button"
					onClick={onDelete}
					disabled={deletePending}
					className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950 sm:w-auto sm:gap-1 sm:px-2.5"
				>
					<Trash2 size={12} />
				</button>
				<button
					type="button"
					onClick={onSpoil}
					disabled={spoilPending || !consumeAmount}
					title="Mark amount as spoiled"
					className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900 sm:w-auto sm:gap-1 sm:px-2.5"
				>
					<Skull size={12} />
					<span className="hidden sm:inline">Spoil</span>
				</button>
				<button
					type="button"
					onClick={onSpoilAll}
					disabled={spoilPending || Number.parseFloat(entry.quantity) <= 0}
					title="Mark all as spoiled"
					className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900 sm:w-auto sm:gap-1 sm:px-2.5"
				>
					<Skull size={12} className="sm:hidden" />
					<span className="hidden sm:inline">Spoil All</span>
				</button>
				<AmberButton
					type="button"
					onClick={onConsume}
					disabled={consumePending || !consumeAmount}
					className="flex items-center gap-1"
				>
					<UtensilsCrossed size={12} className="sm:hidden" />
					<span className="hidden sm:inline">Consume</span>
				</AmberButton>
				<AmberButton
					type="button"
					onClick={onConsumeAll}
					disabled={consumePending || Number.parseFloat(entry.quantity) <= 0}
					title="Consume all remaining stock"
					className="flex items-center gap-1 bg-amber-700"
				>
					<span className="sm:hidden">All</span>
					<span className="hidden sm:inline">Consume All</span>
				</AmberButton>
			</div>
		</div>
	);
}
