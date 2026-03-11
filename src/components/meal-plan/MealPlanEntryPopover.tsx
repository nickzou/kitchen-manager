import { CookingPot, Minus, Plus, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";

interface MealPlanEntryPopoverProps {
	entry: MealPlanEntry;
	onClose: () => void;
	onUpdateServings: (servings: number | null) => void;
	onDelete: () => void;
	onCook: () => void;
	onUncook: () => void;
	isCooking: boolean;
}

export function MealPlanEntryPopover({
	entry,
	onClose,
	onUpdateServings,
	onDelete,
	onCook,
	onUncook,
	isCooking,
}: MealPlanEntryPopoverProps) {
	const servings = entry.servings ?? entry.recipeServings ?? 1;
	const [localServings, setLocalServings] = useState(servings);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose]);

	function handleServingsChange(delta: number) {
		const next = Math.max(1, localServings + delta);
		setLocalServings(next);
		onUpdateServings(next);
	}

	return (
		<div
			ref={ref}
			className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-(--line) bg-white p-3 shadow-lg dark:bg-[#1a2e30]"
		>
			<p className="mb-2 truncate text-sm font-semibold text-(--sea-ink)">
				{entry.recipeName}
			</p>

			<div className="mb-3 flex items-center gap-2">
				<span className="text-xs text-(--sea-ink-soft)">Servings:</span>
				<button
					type="button"
					onClick={() => handleServingsChange(-1)}
					className="flex h-6 w-6 items-center justify-center rounded border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
				>
					<Minus size={12} />
				</button>
				<span className="min-w-[1.5rem] text-center text-sm font-semibold text-(--sea-ink)">
					{localServings}
				</span>
				<button
					type="button"
					onClick={() => handleServingsChange(1)}
					className="flex h-6 w-6 items-center justify-center rounded border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
				>
					<Plus size={12} />
				</button>
			</div>

			<div className="flex gap-2">
				{entry.cookedAt ? (
					<button
						type="button"
						onClick={onUncook}
						disabled={isCooking}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40"
					>
						<Undo2 size={14} />
						Undo Cook
					</button>
				) : (
					<button
						type="button"
						onClick={onCook}
						disabled={isCooking}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-(--lagoon-deep) px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
					>
						<CookingPot size={14} />
						Cook
					</button>
				)}
				<button
					type="button"
					onClick={onDelete}
					className="flex items-center justify-center rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
				>
					<Trash2 size={14} />
				</button>
			</div>
		</div>
	);
}
