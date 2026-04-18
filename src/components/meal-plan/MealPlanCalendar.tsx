import { Fragment } from "react";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import type { MealSlot } from "#src/lib/hooks/use-meal-slots";
import type { NutritionSummary } from "#src/lib/hooks/use-nutrition-summary";
import { cn } from "#src/lib/utils";
import { MealPlanCell } from "./MealPlanCell";

interface RecipeOption {
	value: string;
	label: string;
}

interface MealPlanCalendarProps {
	weekStart: Date;
	weekStartDay: number;
	mealSlots: MealSlot[];
	entries: MealPlanEntry[];
	recipeOptions: RecipeOption[];
	onAddRecipe: (date: string, mealSlotId: string, recipeId: string) => void;
	onUpdateServings: (entryId: string, servings: number | null) => void;
	onDeleteEntry: (entryId: string) => void;
	onCookEntry: (entryId: string) => void;
	onUncookEntry: (entryId: string) => void;
	isCooking: boolean;
	selectedDay: number;
	onSelectDay: (day: number) => void;
	nutritionSummary?: NutritionSummary;
}

const ALL_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayNames(startDay: number): string[] {
	return Array.from({ length: 7 }, (_, i) => ALL_DAY_NAMES[(startDay + i) % 7]);
}

function getDayDates(weekStart: Date): Date[] {
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(weekStart);
		d.setDate(d.getDate() + i);
		return d;
	});
}

function toDateString(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function MealPlanCalendar({
	weekStart,
	weekStartDay,
	mealSlots,
	entries,
	recipeOptions,
	onAddRecipe,
	onUpdateServings,
	onDeleteEntry,
	onCookEntry,
	onUncookEntry,
	isCooking,
	selectedDay,
	onSelectDay,
	nutritionSummary,
}: MealPlanCalendarProps) {
	const days = getDayDates(weekStart);
	const dayNames = getDayNames(weekStartDay);
	const today = new Date();

	// Desktop grid
	const desktopGrid = (
		<div className="hidden sm:block">
			<div
				className="grid gap-px bg-(--line) rounded-xl overflow-hidden border border-(--line)"
				style={{
					gridTemplateColumns: `5rem repeat(7, minmax(0, 1fr))`,
				}}
			>
				{/* Header row */}
				<div className="bg-(--surface-strong) p-2" />
				{days.map((day, i) => (
					<div
						key={dayNames[i]}
						className={cn(
							"bg-(--surface-strong) p-2 text-center text-xs font-semibold",
							isSameDay(day, today)
								? "text-(--lagoon-deep)"
								: "text-(--sea-ink-soft)",
						)}
					>
						<div>{dayNames[i]}</div>
						<div
							className={cn(
								"mt-0.5 text-base font-bold",
								isSameDay(day, today) && "text-(--lagoon-deep)",
							)}
						>
							{day.getDate()}
						</div>
					</div>
				))}

				{/* Slot rows */}
				{mealSlots.map((slot) => (
					<Fragment key={slot.id}>
						<div className="flex items-start bg-(--surface-strong) p-2 text-xs font-semibold text-(--sea-ink-soft)">
							{slot.name}
						</div>
						{days.map((day, i) => {
							const dateStr = toDateString(day);
							const cellEntries = entries.filter(
								(e) => e.mealSlotId === slot.id && e.date === toDateString(day),
							);
							return (
								<div
									key={`${slot.id}-${dayNames[i]}`}
									className={cn(
										"bg-white dark:bg-[#1a2e30]",
										isSameDay(day, today) &&
											"bg-[rgba(79,184,178,0.04)] dark:bg-[rgba(79,184,178,0.06)]",
									)}
								>
									<MealPlanCell
										entries={cellEntries}
										recipeOptions={recipeOptions}
										onAddRecipe={(recipeId) =>
											onAddRecipe(dateStr, slot.id, recipeId)
										}
										onUpdateServings={onUpdateServings}
										onDeleteEntry={onDeleteEntry}
										onCookEntry={onCookEntry}
										onUncookEntry={onUncookEntry}
										isCooking={isCooking}
									/>
								</div>
							);
						})}
					</Fragment>
				))}

				{/* Nutrition summary row */}
				{nutritionSummary && (
					<>
						<div className="flex items-start bg-(--surface-strong) p-2 text-xs font-semibold text-(--sea-ink-soft)" />
						{days.map((day, i) => {
							const dateStr = toDateString(day);
							const dayNutrition = nutritionSummary[dateStr];
							return (
								<div
									key={`nutrition-${dayNames[i]}`}
									className={cn(
										"bg-white p-2 dark:bg-[#1a2e30]",
										isSameDay(day, today) &&
											"bg-[rgba(79,184,178,0.04)] dark:bg-[rgba(79,184,178,0.06)]",
									)}
								>
									{dayNutrition ? (
										<div className="text-center">
											<p className="text-sm font-bold text-(--sea-ink)">
												{Math.round(dayNutrition.calories)} cal
											</p>
											<p className="text-[0.65rem] text-(--sea-ink-soft)">
												{dayNutrition.protein.toFixed(0)}p /{" "}
												{dayNutrition.fat.toFixed(0)}f /{" "}
												{dayNutrition.carbs.toFixed(0)}c
											</p>
										</div>
									) : null}
								</div>
							);
						})}
					</>
				)}
			</div>
		</div>
	);

	// Mobile single-day view
	const mobileDay = days[selectedDay];
	const mobileDateStr = toDateString(mobileDay);
	const mobileView = (
		<div className="sm:hidden">
			{/* Day picker */}
			<div className="mb-4 flex gap-1">
				{days.map((day, i) => (
					<button
						key={dayNames[i]}
						type="button"
						onClick={() => onSelectDay(i)}
						className={cn(
							"flex flex-1 flex-col items-center rounded-lg py-1.5 text-xs transition",
							i === selectedDay
								? "bg-(--lagoon) text-white"
								: "text-(--sea-ink-soft) hover:bg-(--surface)",
							isSameDay(day, today) &&
								i !== selectedDay &&
								"font-bold text-(--lagoon-deep)",
						)}
					>
						<span>{dayNames[i]}</span>
						<span className="text-sm font-bold">{day.getDate()}</span>
					</button>
				))}
			</div>

			{/* Slots for selected day */}
			<div className="flex flex-col gap-3">
				{mealSlots.map((slot) => {
					const cellEntries = entries.filter(
						(e) => e.mealSlotId === slot.id && e.date === mobileDateStr,
					);
					return (
						<div
							key={slot.id}
							className="rounded-xl border border-(--line) bg-white p-3 dark:bg-[#1a2e30]"
						>
							<p className="mb-2 text-xs font-semibold text-(--sea-ink-soft)">
								{slot.name}
							</p>
							<MealPlanCell
								entries={cellEntries}
								recipeOptions={recipeOptions}
								onAddRecipe={(recipeId) =>
									onAddRecipe(mobileDateStr, slot.id, recipeId)
								}
								onUpdateServings={onUpdateServings}
								onDeleteEntry={onDeleteEntry}
								onCookEntry={onCookEntry}
								onUncookEntry={onUncookEntry}
								isCooking={isCooking}
							/>
						</div>
					);
				})}

				{nutritionSummary && nutritionSummary[mobileDateStr] && (
					<div className="mt-3 rounded-xl border border-(--line) bg-white p-3 text-center dark:bg-[#1a2e30]">
						<p className="text-sm font-bold text-(--sea-ink)">
							{Math.round(nutritionSummary[mobileDateStr].calories)} cal
						</p>
						<p className="text-xs text-(--sea-ink-soft)">
							{nutritionSummary[mobileDateStr].protein.toFixed(0)}g protein /{" "}
							{nutritionSummary[mobileDateStr].fat.toFixed(0)}g fat /{" "}
							{nutritionSummary[mobileDateStr].carbs.toFixed(0)}g carbs
						</p>
					</div>
				)}
			</div>
		</div>
	);

	return (
		<>
			{desktopGrid}
			{mobileView}
		</>
	);
}
