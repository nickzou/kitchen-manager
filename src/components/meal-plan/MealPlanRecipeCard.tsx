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

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-2 rounded-lg border border-(--line) bg-(--surface) px-2 py-1.5 text-left text-xs transition hover:border-(--lagoon) hover:shadow-sm",
			)}
		>
			{entry.recipeImage && (
				<img
					src={entry.recipeImage}
					alt=""
					className="h-7 w-7 rounded object-cover"
				/>
			)}
			<span className="flex-1 truncate font-medium text-(--sea-ink)">
				{entry.recipeName ?? "Unknown recipe"}
			</span>
			{servings && (
				<span className="shrink-0 rounded-full bg-[rgba(79,184,178,0.14)] px-1.5 py-0.5 text-[10px] font-semibold text-(--lagoon-deep)">
					{servings}
				</span>
			)}
		</button>
	);
}
