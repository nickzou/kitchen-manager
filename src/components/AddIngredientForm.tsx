import { Plus } from "lucide-react";
import { useId } from "react";
import { Combobox } from "#src/components/Combobox";
import { NumberInput } from "#src/components/NumberInput";

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
	onCreateProduct,
}: {
	productOptions: ComboboxOption[];
	unitOptions: ComboboxOption[];
	onAdd: () => void;
	isPending: boolean;
	newIngredient: IngredientFormState;
	setNewIngredient: (state: IngredientFormState) => void;
	onCreateProduct?: (name: string) => Promise<string>;
}) {
	const htmlId = useId();
	const inputClass =
		"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	function update(partial: Partial<IngredientFormState>) {
		setNewIngredient({
			productId,
			quantity,
			quantityUnitId,
			notes,
			...partial,
		});
	}

	return (
		<div className="border-t border-(--line) pt-4">
			<h3 className="mb-3 text-sm font-semibold text-(--sea-ink)">
				Add ingredient
			</h3>
			<div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[1fr_auto_1fr_1fr_auto]">
				<Combobox
					value={productId}
					onChange={(v) => update({ productId: v })}
					options={productOptions}
					placeholder="Product"
					className="col-span-full sm:col-span-1"
					onCreateNew={
						onCreateProduct
							? async (name) => {
									const newId = await onCreateProduct(name);
									update({ productId: newId });
								}
							: undefined
					}
				/>
				<NumberInput
					id={`${htmlId}-ing-qty`}
					step="any"
					min="0"
					placeholder="Qty"
					value={quantity}
					onChange={(e) => update({ quantity: e.target.value })}
				/>
				<Combobox
					value={quantityUnitId}
					onChange={(v) => update({ quantityUnitId: v })}
					options={unitOptions}
					placeholder="Unit"
				/>
				<input
					type="text"
					placeholder="Notes"
					value={notes}
					onChange={(e) => update({ notes: e.target.value })}
					className={inputClass}
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
	);
}
