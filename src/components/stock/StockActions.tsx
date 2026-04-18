import { Skull, UtensilsCrossed } from "lucide-react";
import { NumberInput } from "#src/components/NumberInput";
import { AmberButton } from "#src/components/stock/AmberButton";

export function StockActions({
	quantity,
	consumeAmount,
	onConsumeAmountChange,
	onConsume,
	onConsumeAll,
	consumePending,
	onSpoil,
	onSpoilAll,
	spoilPending,
}: {
	quantity: string;
	consumeAmount: string;
	onConsumeAmountChange: (value: string) => void;
	onConsume: () => void;
	onConsumeAll: () => void;
	consumePending: boolean;
	onSpoil: () => void;
	onSpoilAll: () => void;
	spoilPending: boolean;
}) {
	return (
		<>
			<NumberInput
				placeholder="Qty"
				step="any"
				min="0.01"
				max={quantity}
				value={consumeAmount}
				onChange={(e) => onConsumeAmountChange(e.target.value)}
				className="h-7 flex-1 rounded border bg-white px-2 text-xs sm:w-20 sm:flex-none dark:bg-(--surface)"
			/>
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
				disabled={spoilPending || Number.parseFloat(quantity) <= 0}
				title="Mark all as spoiled"
				className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900 sm:w-auto sm:gap-1 sm:px-2.5"
			>
				<span className="sm:hidden">All</span>
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
				disabled={consumePending || Number.parseFloat(quantity) <= 0}
				title="Consume all remaining stock"
				className="flex items-center gap-1 bg-amber-700"
			>
				<span className="sm:hidden">All</span>
				<span className="hidden sm:inline">Consume All</span>
			</AmberButton>
		</>
	);
}
