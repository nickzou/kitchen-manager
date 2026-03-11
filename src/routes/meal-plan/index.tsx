import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useCallback, useState } from "react";
import { Island } from "#src/components/Island";
import { MealPlanCalendar } from "#src/components/meal-plan/MealPlanCalendar";
import { MealSlotManager } from "#src/components/meal-plan/MealSlotManager";
import { WeekNavigation } from "#src/components/meal-plan/WeekNavigation";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";
import {
	useCookMealPlanEntry,
	useCreateMealPlanEntry,
	useDeleteMealPlanEntry,
	useMealPlanEntries,
	useUncookMealPlanEntry,
	useUpdateMealPlanEntry,
} from "#src/lib/hooks/use-meal-plan-entries";
import {
	useCreateMealSlot,
	useDeleteMealSlot,
	useMealSlots,
	useReorderMealSlots,
	useUpdateMealSlot,
} from "#src/lib/hooks/use-meal-slots";
import { useRecipes } from "#src/lib/hooks/use-recipes";

export const Route = createFileRoute("/meal-plan/")({
	component: MealPlanPage,
});

function getMonday(d: Date): Date {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	date.setDate(diff);
	date.setHours(0, 0, 0, 0);
	return date;
}

function toDateString(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MealPlanPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
	const [showSlotManager, setShowSlotManager] = useState(false);
	const [selectedDay, setSelectedDay] = useState(() => {
		const today = new Date();
		const day = today.getDay();
		return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
	});
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 6);

	const startStr = toDateString(weekStart);
	const endStr = toDateString(weekEnd);

	const { data: mealSlots } = useMealSlots();
	const { data: entries } = useMealPlanEntries(startStr, endStr);
	const { data: recipes } = useRecipes();

	const createEntry = useCreateMealPlanEntry();
	const updateEntry = useUpdateMealPlanEntry();
	const deleteEntry = useDeleteMealPlanEntry();
	const cookEntry = useCookMealPlanEntry();
	const uncookEntry = useUncookMealPlanEntry();
	const createSlot = useCreateMealSlot();
	const updateSlot = useUpdateMealSlot();
	const reorderSlots = useReorderMealSlots();
	const deleteSlot = useDeleteMealSlot();

	const recipeOptions = (recipes ?? []).map((r) => ({
		value: r.id,
		label: r.name,
	}));

	const handlePrevWeek = useCallback(() => {
		setWeekStart((prev) => {
			const d = new Date(prev);
			d.setDate(d.getDate() - 7);
			return d;
		});
	}, []);

	const handleNextWeek = useCallback(() => {
		setWeekStart((prev) => {
			const d = new Date(prev);
			d.setDate(d.getDate() + 7);
			return d;
		});
	}, []);

	const handleToday = useCallback(() => {
		setWeekStart(getMonday(new Date()));
		const today = new Date();
		const day = today.getDay();
		setSelectedDay(day === 0 ? 6 : day - 1);
	}, []);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	function handleAddRecipe(date: string, mealSlotId: string, recipeId: string) {
		createEntry.mutate({ date, mealSlotId, recipeId });
	}

	function handleUpdateServings(entryId: string, servings: number | null) {
		updateEntry.mutate({ id: entryId, servings });
	}

	function handleDeleteEntry(entryId: string) {
		deleteEntry.mutate(entryId);
	}

	function handleCookEntry(entryId: string) {
		cookEntry.mutate(entryId);
	}

	function handleUncookEntry(entryId: string) {
		uncookEntry.mutate(entryId);
	}

	function handleCreateSlot(name: string, sortOrder: number) {
		createSlot.mutate({ name, sortOrder });
	}

	function handleUpdateSlot(
		id: string,
		updates: { name?: string; sortOrder?: number },
	) {
		updateSlot.mutate({ id, ...updates });
	}

	function handleDeleteSlot(id: string) {
		deleteSlot.mutate(id);
	}

	return (
		<Page as="main" className="pb-8 pt-14">
			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Planning
				</p>
				<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
					<h1 className="font-display text-3xl font-bold text-(--sea-ink)">
						Meal Plan
					</h1>
					<div className="flex items-center gap-3">
						<Link
							to="/meal-plan/shopping-list"
							className="rounded-lg border border-(--line) px-3 py-1.5 text-xs font-semibold text-(--sea-ink-soft) no-underline transition hover:bg-(--surface)"
						>
							Shopping List
						</Link>
						<button
							type="button"
							onClick={() => setShowSlotManager(!showSlotManager)}
							className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
						>
							<Settings size={16} />
						</button>
					</div>
				</div>

				<div className="mb-4">
					<WeekNavigation
						weekStart={weekStart}
						onPrevWeek={handlePrevWeek}
						onNextWeek={handleNextWeek}
						onToday={handleToday}
					/>
				</div>

				{showSlotManager && (
					<div className="mb-4">
						<MealSlotManager
							slots={mealSlots ?? []}
							onCreateSlot={handleCreateSlot}
							onUpdateSlot={handleUpdateSlot}
							onReorderSlots={(ids) => reorderSlots.mutate(ids)}
							onDeleteSlot={handleDeleteSlot}
						/>
					</div>
				)}

				{mealSlots && (
					<MealPlanCalendar
						weekStart={weekStart}
						mealSlots={mealSlots}
						entries={entries ?? []}
						recipeOptions={recipeOptions}
						onAddRecipe={handleAddRecipe}
						onUpdateServings={handleUpdateServings}
						onDeleteEntry={handleDeleteEntry}
						onCookEntry={handleCookEntry}
						onUncookEntry={handleUncookEntry}
						isCooking={cookEntry.isPending || uncookEntry.isPending}
						selectedDay={selectedDay}
						onSelectDay={setSelectedDay}
					/>
				)}
			</Island>
		</Page>
	);
}
