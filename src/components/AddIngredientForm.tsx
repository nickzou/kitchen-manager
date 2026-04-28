import { Plus, X } from "lucide-react";
import { useId } from "react";
import { Button } from "#src/components/Button";
import { Combobox } from "#src/components/Combobox";
import { Input } from "#src/components/Input";
import { NumberInput } from "#src/components/NumberInput";
import { SectionHeading } from "#src/components/SectionHeading";

export type IngredientFormState = {
	productId: string;
	quantity: string;
	quantityUnitId: string;
	notes: string;
	optional: boolean;
	skipStockDeduction: boolean;
};

type ComboboxOption = { value: string; label: string };

export function AddIngredientForm({
	productOptions,
	unitOptions,
	onAdd,
	isPending,
	newIngredient: {
		productId,
		quantity,
		quantityUnitId,
		notes,
		optional,
		skipStockDeduction,
	},
	setNewIngredient,
	onCreateProduct,
	onProductChange,
	unitHint,
	mode = "ingredient",
	onModeChange,
	groupName,
	onGroupNameChange,
	addButtonLabel,
	targetGroup,
	onCancelTargetGroup,
}: {
	productOptions: ComboboxOption[];
	unitOptions: ComboboxOption[];
	onAdd: () => void;
	isPending: boolean;
	newIngredient: IngredientFormState;
	setNewIngredient: (state: IngredientFormState) => void;
	onCreateProduct?: (name: string) => Promise<string>;
	onProductChange?: (productId: string) => void;
	unitHint?: string;
	mode?: "ingredient" | "group";
	onModeChange?: (mode: "ingredient" | "group") => void;
	groupName?: string;
	onGroupNameChange?: (name: string) => void;
	addButtonLabel?: string;
	targetGroup?: string | null;
	onCancelTargetGroup?: () => void;
}) {
	const htmlId = useId();

	function update(partial: Partial<IngredientFormState>) {
		setNewIngredient({
			productId,
			quantity,
			quantityUnitId,
			notes,
			optional,
			skipStockDeduction,
			...partial,
		});
	}

	return (
		<div className="border-t border-(--line) pt-4">
			<SectionHeading>Add ingredient</SectionHeading>

			{targetGroup && onCancelTargetGroup && (
				<div className="mb-3 flex items-center gap-2 rounded-lg bg-[rgba(79,184,178,0.14)] px-3 py-1.5 text-sm text-(--lagoon-deep)">
					<span className="flex-1">
						Adding to: <span className="font-medium">{targetGroup}</span>
					</span>
					<button
						type="button"
						onClick={onCancelTargetGroup}
						className="rounded p-0.5 transition hover:bg-[rgba(79,184,178,0.2)]"
						title="Cancel adding to group"
					>
						<X size={14} />
					</button>
				</div>
			)}

			{onModeChange && !targetGroup && (
				<div className="mb-3 inline-flex rounded-lg border border-(--line) p-0.5">
					<button
						type="button"
						onClick={() => onModeChange("ingredient")}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
							mode === "ingredient"
								? "bg-(--lagoon) text-white"
								: "text-(--sea-ink-soft) hover:text-(--sea-ink)"
						}`}
					>
						Ingredient
					</button>
					<button
						type="button"
						onClick={() => onModeChange("group")}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
							mode === "group"
								? "bg-(--lagoon) text-white"
								: "text-(--sea-ink-soft) hover:text-(--sea-ink)"
						}`}
					>
						Group
					</button>
				</div>
			)}

			{mode === "group" && onGroupNameChange && (
				<Input
					type="text"
					placeholder="Group name, e.g. 'Protein' (optional)"
					value={groupName ?? ""}
					onChange={(e) => onGroupNameChange(e.target.value)}
					className="mb-2"
				/>
			)}

			<div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[2fr_5rem_1fr_1fr_auto_auto_auto]">
				<Combobox
					value={productId}
					onChange={(v) => {
						update({ productId: v });
						onProductChange?.(v);
					}}
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
				<Input
					type="text"
					placeholder="Notes"
					value={notes}
					onChange={(e) => update({ notes: e.target.value })}
				/>
				<label className="flex items-center gap-1.5 text-sm text-(--sea-ink-soft) cursor-pointer select-none">
					<input
						type="checkbox"
						checked={optional}
						onChange={(e) => update({ optional: e.target.checked })}
						className="accent-(--lagoon)"
					/>
					Optional
				</label>
				<label
					className="flex text-nowrap items-center gap-1.5 text-sm text-(--sea-ink-soft) cursor-pointer select-none"
					title="Don't deduct from stock when this recipe is cooked (e.g. salt to taste)"
				>
					<input
						type="checkbox"
						checked={skipStockDeduction}
						onChange={(e) => update({ skipStockDeduction: e.target.checked })}
						className="accent-(--lagoon)"
					/>
					Don't track
				</label>
				<Button
					type="button"
					onClick={onAdd}
					disabled={isPending || !quantity}
					className="flex items-center gap-1 px-3"
				>
					<Plus size={14} />
					{addButtonLabel ?? "Add"}
				</Button>
			</div>
			{unitHint && (
				<p
					className={`mt-1.5 text-xs ${unitHint.includes("No conversion") ? "text-amber-600 dark:text-amber-400" : "text-(--sea-ink-soft)"}`}
				>
					{unitHint}
				</p>
			)}
		</div>
	);
}
