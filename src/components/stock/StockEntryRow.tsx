import { Pencil, Trash2, UtensilsCrossed } from "lucide-react";
import { NumberInput } from "#src/components/NumberInput";
import { AmberButton } from "#src/components/stock/AmberButton";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";

export function StockEntryRow({
    entry,
    unitAbbr,
    consumeAmount,
    onConsumeAmountChange,
    onConsume,
    consumePending,
    onEdit,
    onDelete,
    deletePending,
    storeName,
    brandName,
}: {
    entry: StockEntry;
    unitAbbr: string;
    consumeAmount: string;
    onConsumeAmountChange: (value: string) => void;
    onConsume: () => void;
    consumePending: boolean;
    onEdit: () => void;
    onDelete: () => void;
    deletePending: boolean;
    storeName: string | null;
    brandName: string | null;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-(--surface) pl-3 py-2 text-xs text-(--sea-ink-soft)">
            <span className="font-medium text-(--sea-ink)">
                {entry.quantity}
                {unitAbbr ? ` ${unitAbbr}` : ""}
            </span>
            {entry.expirationDate && (
                <span>Exp: {new Date(entry.expirationDate).toLocaleDateString()}</span>
            )}
            {entry.purchaseDate && (
                <span>
                    Purchased: {new Date(entry.purchaseDate).toLocaleDateString()}
                </span>
            )}
            {entry.price && <span>${entry.price}</span>}
            {brandName && <span>{brandName}</span>}
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
                    onClick={onDelete}
                    disabled={deletePending}
                    className="flex h-7 items-center gap-1 rounded-full border border-red-200 px-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
                >
                    <Trash2 size={12} />
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
            </div>
        </div>
    );
}
