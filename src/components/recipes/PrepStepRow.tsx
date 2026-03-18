import { Check, Pencil, Trash2 } from "lucide-react";
import { Input } from "#src/components/Input";
import { NumberInput } from "#src/components/NumberInput";
import type { RecipePrepStep } from "#src/lib/hooks/use-recipe-prep-steps";

interface EditState {
	description: string;
	leadTimeMinutes: string;
}

export interface PrepStepRowProps {
	step: RecipePrepStep;
	isEditing: boolean;
	editState: EditState;
	onEditStateChange: (state: EditState) => void;
	isSaving: boolean;
	onSave: () => void;
	onCancel: () => void;
	onEdit: () => void;
	onDelete: () => void;
	formatLeadTime: (minutes: number) => string;
	readOnly?: boolean;
}

export function PrepStepRow({
	step,
	isEditing,
	editState,
	onEditStateChange,
	isSaving,
	onSave,
	onCancel,
	onEdit,
	onDelete,
	formatLeadTime,
	readOnly,
}: PrepStepRowProps) {
	if (isEditing && !readOnly) {
		return (
			<div className="flex flex-col gap-3 rounded-lg border border-(--lagoon) p-3">
				<Input
					type="text"
					placeholder="Description"
					value={editState.description}
					onChange={(e) =>
						onEditStateChange({
							...editState,
							description: e.target.value,
						})
					}
				/>
				<div className="flex flex-col gap-1">
					<NumberInput
						min="1"
						placeholder="Lead time (minutes)"
						value={editState.leadTimeMinutes}
						onChange={(e) =>
							onEditStateChange({
								...editState,
								leadTimeMinutes: e.target.value,
							})
						}
						className="w-full"
					/>
					{editState.leadTimeMinutes && (
						<p className="text-xs text-(--sea-ink-soft)">
							{formatLeadTime(Number.parseInt(editState.leadTimeMinutes, 10))}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={onSave}
						disabled={
							isSaving || !editState.description || !editState.leadTimeMinutes
						}
						className="flex h-8 items-center gap-1 rounded-full bg-(--lagoon) px-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						<Check size={14} />
						{isSaving ? "Saving…" : "Save"}
					</button>
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
			<div className="flex-1 text-sm text-(--sea-ink)">
				<span className="font-medium">{step.description}</span>
				<span className="ml-2 text-(--sea-ink-soft)">
					{formatLeadTime(step.leadTimeMinutes)}
				</span>
			</div>
			{!readOnly && (
				<div className="flex gap-0.5">
					<button
						type="button"
						onClick={onEdit}
						className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
						title="Edit prep step"
					>
						<Pencil size={14} />
					</button>
					<button
						type="button"
						onClick={onDelete}
						className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
						title="Delete prep step"
					>
						<Trash2 size={14} />
					</button>
				</div>
			)}
		</div>
	);
}
