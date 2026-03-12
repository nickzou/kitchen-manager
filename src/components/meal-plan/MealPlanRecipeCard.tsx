import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import { cn } from "#src/lib/utils";

interface MealPlanRecipeCardProps {
	entry: MealPlanEntry;
	onClick: () => void;
}

export function MealPlanRecipeCard({
	entry,
	onClick,
}: MealPlanRecipeCardProps) {
	const servings = entry.servings ?? entry.recipeServings;
	const isCooked = !!entry.cookedAt;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition hover:shadow-sm",
				isCooked
					? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
					: "border-(--line) bg-(--surface) hover:border-(--lagoon)",
			)}
		>
			{entry.recipeImage && (
				<img
					src={entry.recipeImage}
					alt=""
					className={cn(
						"h-7 w-7 rounded object-cover",
						isCooked && "opacity-60",
					)}
				/>
			)}
			<span
				className={cn(
					"flex-1 truncate font-medium",
					isCooked ? "text-(--sea-ink-soft)" : "text-(--sea-ink)",
				)}
			>
				{entry.recipeName ?? "Unknown recipe"}
			</span>
			{isCooked && (
				<span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
					Done
				</span>
			)}
			{!isCooked && servings && (
				<span className="shrink-0 rounded-full bg-[rgba(79,184,178,0.14)] px-1.5 py-0.5 text-[10px] font-semibold text-(--lagoon-deep)">
					{servings}
				</span>
			)}
		</button>
	);
}
