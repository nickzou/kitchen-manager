import { Plus } from "lucide-react";
import { useState } from "react";
import { Combobox } from "#src/components/Combobox";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import { MealPlanEntryPopover } from "./MealPlanEntryPopover";
import { MealPlanRecipeCard } from "./MealPlanRecipeCard";

interface RecipeOption {
	value: string;
	label: string;
}

interface MealPlanCellProps {
	entries: MealPlanEntry[];
	recipeOptions: RecipeOption[];
	onAddRecipe: (recipeId: string) => void;
	onUpdateServings: (entryId: string, servings: number | null) => void;
	onDeleteEntry: (entryId: string) => void;
	onCookEntry: (entryId: string) => void;
	onUncookEntry: (entryId: string) => void;
	isCooking: boolean;
}

export function MealPlanCell({
	entries,
	recipeOptions,
	onAddRecipe,
	onUpdateServings,
	onDeleteEntry,
	onCookEntry,
	onUncookEntry,
	isCooking,
}: MealPlanCellProps) {
	const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
	const [showPicker, setShowPicker] = useState(false);

	return (
		<div className="flex min-h-[4rem] flex-col gap-1 p-1">
			{entries.map((entry) => (
				<div key={entry.id} className="relative">
					<MealPlanRecipeCard
						entry={entry}
						onClick={() =>
							setSelectedEntryId(selectedEntryId === entry.id ? null : entry.id)
						}
					/>
					{selectedEntryId === entry.id && (
						<MealPlanEntryPopover
							entry={entry}
							onClose={() => setSelectedEntryId(null)}
							onUpdateServings={(s) => onUpdateServings(entry.id, s)}
							onDelete={() => {
								onDeleteEntry(entry.id);
								setSelectedEntryId(null);
							}}
							onCook={() => {
								onCookEntry(entry.id);
								setSelectedEntryId(null);
							}}
							onUncook={() => {
								onUncookEntry(entry.id);
								setSelectedEntryId(null);
							}}
							isCooking={isCooking}
						/>
					)}
				</div>
			))}

			{showPicker ? (
				<Combobox
					value=""
					onChange={(recipeId) => {
						onAddRecipe(recipeId);
						setShowPicker(false);
					}}
					options={recipeOptions}
					placeholder="Search recipes…"
					className="w-full"
				/>
			) : (
				<button
					type="button"
					onClick={() => setShowPicker(true)}
					className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-(--line) py-1 text-xs text-(--sea-ink-soft) transition hover:border-(--lagoon) hover:text-(--lagoon-deep)"
				>
					<Plus size={12} />
				</button>
			)}
		</div>
	);
}
