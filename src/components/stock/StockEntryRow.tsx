import { Minus, Pencil } from "lucide-react";
import { NumberInput } from "#src/components/NumberInput";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";

export function StockEntryRow({
    entry,
    unitAbbr,
    consumeAmount,
    onConsumeAmountChange,
    onConsume,
    consumePending,
    onEdit,
    storeName,
}: {
    entry: StockEntry;
    unitAbbr: string;
    consumeAmount: string;
    onConsumeAmountChange: (value: string) => void;
    onConsume: () => void;
    consumePending: boolean;
    onEdit: () => void;
    storeName: string | null;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-(--surface) px-3 py-2 text-xs text-(--sea-ink-soft)">
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
                    Purchased:{" "}
                    {new Date(entry.purchaseDate).toLocaleDateString()}
                </span>
            )}
            {entry.price && <span>${entry.price}</span>}
            {storeName && <span>{storeName}</span>}
            <div className="ml-auto flex items-center gap-1.5">
                <NumberInput
                    placeholder="Qty"
                    step="any"
                    min="0.01"
                    max={entry.quantity}
                    value={consumeAmount}
                    onChange={(e) => onConsumeAmountChange(e.target.value)}
                    className="h-7 w-20 rounded border bg-white px-2 text-xs dark:bg-(--surface)"
                />
                <button
                    type="button"
                    onClick={onEdit}
                    className="flex h-7 items-center gap-1 rounded-full border border-(--line) px-2.5 text-xs font-semibold text-(--sea-ink-soft) transition hover:bg-(--line)"
                >
                    <Pencil size={12} />
                </button>
                <button
                    type="button"
                    onClick={onConsume}
                    disabled={consumePending || !consumeAmount}
                    className="flex h-7 items-center gap-1 rounded-full bg-amber-600 px-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                    <Minus size={12} />
                    Use
                </button>
            </div>
        </div>
    );
}
