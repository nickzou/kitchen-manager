import { Plus } from "lucide-react";
import { useState } from "react";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import { MealPlanEntryDetailModal } from "./MealPlanEntryDetailModal";
import { MealPlanRecipeCard } from "./MealPlanRecipeCard";
import { MealPlanRecipePickerModal } from "./MealPlanRecipePickerModal";

interface MealPlanCellProps {
	entries: MealPlanEntry[];
	onAddRecipe: (recipeId: string) => void;
	onUpdateServings: (entryId: string, servings: number | null) => void;
	onDeleteEntry: (entryId: string) => void;
	onCookEntry: (entryId: string) => void;
	onUncookEntry: (entryId: string) => void;
	isCooking: boolean;
}

export function MealPlanCell({
	entries,
	onAddRecipe,
	onUpdateServings,
	onDeleteEntry,
	onCookEntry,
	onUncookEntry,
	isCooking,
}: MealPlanCellProps) {
	const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
	const [showPicker, setShowPicker] = useState(false);

	const selectedEntry = selectedEntryId
		? entries.find((e) => e.id === selectedEntryId)
		: null;

	return (
		<div className="flex min-h-[4rem] flex-col gap-1 p-1">
			{entries.map((entry) => (
				<MealPlanRecipeCard
					key={entry.id}
					entry={entry}
					onClick={() => setSelectedEntryId(entry.id)}
				/>
			))}

			<button
				type="button"
				onClick={() => setShowPicker(true)}
				className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-(--line) py-1 text-xs text-(--sea-ink-soft) transition hover:border-(--lagoon) hover:text-(--lagoon-deep)"
				aria-label="Add recipe"
			>
				<Plus size={12} />
			</button>

			<MealPlanRecipePickerModal
				open={showPicker}
				onOpenChange={setShowPicker}
				onPick={(recipeId) => onAddRecipe(recipeId)}
			/>

			{selectedEntry && (
				<MealPlanEntryDetailModal
					entry={selectedEntry}
					open={true}
					onOpenChange={(open) => {
						if (!open) setSelectedEntryId(null);
					}}
					onUpdateServings={(s) => onUpdateServings(selectedEntry.id, s)}
					onDelete={() => {
						onDeleteEntry(selectedEntry.id);
						setSelectedEntryId(null);
					}}
					onCook={() => {
						onCookEntry(selectedEntry.id);
						setSelectedEntryId(null);
					}}
					onUncook={() => {
						onUncookEntry(selectedEntry.id);
						setSelectedEntryId(null);
					}}
					isCooking={isCooking}
				/>
			)}
		</div>
	);
}
