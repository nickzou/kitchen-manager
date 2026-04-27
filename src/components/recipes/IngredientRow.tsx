import {
	Check,
	CircleCheck,
	CircleX,
	Pencil,
	Trash2,
	UtensilsCrossed,
} from "lucide-react";
import type { IngredientFormState } from "#src/components/AddIngredientForm";
import { Button } from "#src/components/Button";
import { Combobox } from "#src/components/Combobox";
import { Input } from "#src/components/Input";
import { NumberInput } from "#src/components/NumberInput";
import { StatusIcon } from "#src/components/StatusIcon";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";

type EditState = IngredientFormState & { groupName: string };

export interface IngredientRowProps {
	ingredient: RecipeIngredient;
	productName: string;
	unitLabel: string | null;
	scaledQuantity: string;
	status?: "sufficient" | "deficit" | "unknown";
	isEditing: boolean;
	editState: EditState;
	onEditStateChange: (state: EditState) => void;
	conversionHint?: string;
	isSaving: boolean;
	onSave: () => void;
	onCancel: () => void;
	onEditProductChange: (productId: string) => void;
	onCreateProduct: (name: string) => Promise<string>;
	onEdit: () => void;
	onDelete: () => void;
	onConsume?: () => void;
	isConsuming?: boolean;
	canConsume?: boolean;
	productOptions: { value: string; label: string }[];
	unitOptions: { value: string; label: string }[];
}

export function IngredientRow({
	ingredient,
	productName,
	unitLabel,
	scaledQuantity,
	status,
	isEditing,
	editState,
	onEditStateChange,
	conversionHint,
	isSaving,
	onSave,
	onCancel,
	onEditProductChange,
	onCreateProduct,
	onEdit,
	onDelete,
	onConsume,
	isConsuming,
	canConsume,
	productOptions,
	unitOptions,
}: IngredientRowProps) {
	if (isEditing) {
		return (
			<div className="flex flex-col gap-3 rounded-lg border border-(--lagoon) p-3">
				<div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[2fr_5rem_1fr_1fr_1fr]">
					<Combobox
						value={editState.productId}
						onChange={(v) => {
							onEditStateChange({
								...editState,
								productId: v,
							});
							onEditProductChange(v);
						}}
						options={productOptions}
						placeholder="Product"
						className="col-span-full sm:col-span-1"
						onCreateNew={async (name) => {
							const newId = await onCreateProduct(name);
							onEditStateChange({
								...editState,
								productId: newId,
							});
						}}
					/>
					<NumberInput
						step="any"
						min="0"
						placeholder="Qty"
						value={editState.quantity}
						onChange={(e) =>
							onEditStateChange({
								...editState,
								quantity: e.target.value,
							})
						}
					/>
					<Combobox
						value={editState.quantityUnitId}
						onChange={(v) =>
							onEditStateChange({
								...editState,
								quantityUnitId: v,
							})
						}
						options={unitOptions}
						placeholder="Unit"
					/>
					<Input
						type="text"
						placeholder="Notes"
						value={editState.notes}
						onChange={(e) =>
							onEditStateChange({
								...editState,
								notes: e.target.value,
							})
						}
					/>
					<Input
						type="text"
						placeholder="Group"
						value={editState.groupName}
						onChange={(e) =>
							onEditStateChange({
								...editState,
								groupName: e.target.value,
							})
						}
					/>
					<label className="flex items-center gap-1.5 text-sm text-(--sea-ink-soft) cursor-pointer select-none">
						<input
							type="checkbox"
							checked={editState.optional}
							onChange={(e) =>
								onEditStateChange({
									...editState,
									optional: e.target.checked,
								})
							}
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
							checked={editState.skipStockDeduction}
							onChange={(e) =>
								onEditStateChange({
									...editState,
									skipStockDeduction: e.target.checked,
								})
							}
							className="accent-(--lagoon)"
						/>
						Don't track
					</label>
				</div>
				{conversionHint && (
					<p
						className={`text-xs ${conversionHint.includes("No conversion") ? "text-amber-600 dark:text-amber-400" : "text-(--sea-ink-soft)"}`}
					>
						{conversionHint}
					</p>
				)}
				<div className="flex gap-2">
					<Button
						type="button"
						onClick={onSave}
						disabled={isSaving || !editState.quantity}
						size="sm"
						className="flex items-center gap-1"
					>
						<Check size={14} />
						{isSaving ? "Saving…" : "Save"}
					</Button>
					<button
						type="button"
						onClick={onCancel}
						className="flex h-8 items-center rounded-full px-3 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
					>
						Cancel
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between rounded-lg border border-(--line) px-3 py-2">
			<div className="flex flex-1 items-center gap-2 text-sm text-(--sea-ink)">
				{status === "sufficient" && (
					<StatusIcon
						icon={<CircleCheck size={16} className="text-emerald-500" />}
						label="You have enough stock for this ingredient"
					/>
				)}
				{status === "deficit" && (
					<StatusIcon
						icon={<CircleX size={16} className="text-red-500" />}
						label="Not enough stock for this ingredient"
					/>
				)}
				{status === "unknown" && (
					<StatusIcon
						icon={<CircleX size={16} className="text-amber-500" />}
						label="Unable to check stock — no unit conversion available"
					/>
				)}
				<span>
					<span className="font-medium">{productName}</span>
					<span className="ml-2 text-(--sea-ink-soft)">
						{scaledQuantity}
						{unitLabel ? ` ${unitLabel}` : ""}
					</span>
					{ingredient.notes && (
						<span className="ml-2 text-xs text-(--sea-ink-soft)">
							({ingredient.notes})
						</span>
					)}
					{ingredient.optional && (
						<span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
							Optional
						</span>
					)}
					{ingredient.skipStockDeduction && (
						<span
							className="ml-2 inline-block rounded-full bg-(--surface) px-2 py-0.5 text-xs font-medium text-(--sea-ink-soft)"
							title="Stock isn't deducted when cooked"
						>
							Not tracked
						</span>
					)}
				</span>
			</div>
			<div className="flex gap-0.5">
				{onConsume && (
					<button
						type="button"
						onClick={onConsume}
						disabled={isConsuming || !canConsume}
						className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto sm:rounded-full sm:px-2.5"
						title="Consume ingredient"
					>
						<UtensilsCrossed size={12} className="sm:hidden" />
						<span className="hidden sm:inline">Consume</span>
					</button>
				)}
				<button
					type="button"
					onClick={onEdit}
					className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
					title="Edit ingredient"
				>
					<Pencil size={14} />
				</button>
				<button
					type="button"
					onClick={onDelete}
					className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
					title="Delete ingredient"
				>
					<Trash2 size={14} />
				</button>
			</div>
		</div>
	);
}
