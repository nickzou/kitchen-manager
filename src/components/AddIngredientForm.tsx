import { Plus } from "lucide-react";
import { useId } from "react";
import { Combobox } from "#src/components/Combobox";
import { NumberInput } from "#src/components/NumberInput";
import { cn } from "#src/lib/utils";

export type IngredientFormState = {
    productId: string;
    quantity: string;
    quantityUnitId: string;
    notes: string;
};

type ComboboxOption = { value: string; label: string };

export function AddIngredientForm({
    productOptions,
    unitOptions,
    onAdd,
    isPending,
    newIngredient: { productId, quantity, quantityUnitId, notes },
    setNewIngredient,
}: {
    productOptions: ComboboxOption[];
    unitOptions: ComboboxOption[];
    onAdd: () => void;
    isPending: boolean;
    newIngredient: IngredientFormState;
    setNewIngredient: (state: IngredientFormState) => void;
}) {
    const htmlId = useId();
    const inputClass =
        "h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

    function update(partial: Partial<IngredientFormState>) {
        setNewIngredient({ productId, quantity, quantityUnitId, notes, ...partial });
    }

    return (
        <div className="border-t border-(--line) pt-4">
            <h3 className="mb-3 text-sm font-semibold text-(--sea-ink)">
                Add ingredient
            </h3>
            <div className="flex flex-wrap items-end gap-2">
                <div className="w-full">
                    <Combobox
                        value={productId}
                        onChange={(v) => update({ productId: v })}
                        options={productOptions}
                        placeholder="Product"
                    />
                </div>
                <div className="flex-1">
                    <NumberInput
                        id={`${htmlId}-ing-qty`}
                        step="any"
                        min="0"
                        placeholder="Qty"
                        value={quantity}
                        onChange={(e) => update({ quantity: e.target.value })}
                    />
                </div>
                <div className="flex-1">
                    <Combobox
                        value={quantityUnitId}
                        onChange={(v) => update({ quantityUnitId: v })}
                        options={unitOptions}
                        placeholder="Unit"
                    />
                </div>
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        placeholder="Notes"
                        value={notes}
                        onChange={(e) => update({ notes: e.target.value })}
                        className={cn(inputClass, "flex-1")}
                    />
                    <button
                        type="button"
                        onClick={onAdd}
                        disabled={isPending || !quantity}
                        className="flex h-10 items-center gap-1 rounded-full bg-(--lagoon-deep) px-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
                    >
                        <Plus size={14} />
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}
