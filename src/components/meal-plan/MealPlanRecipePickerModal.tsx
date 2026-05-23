import { Link } from "@tanstack/react-router";
import { CircleCheck, CircleX } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "#src/components/Modal";
import { SearchInput } from "#src/components/SearchInput";
import { useRecipeCategories } from "#src/lib/hooks/use-categories";
import { useRecipeAvailability } from "#src/lib/hooks/use-recipe-availability";
import { useRecipes } from "#src/lib/hooks/use-recipes";

interface MealPlanRecipePickerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPick: (recipeId: string) => void;
}

function formatTime(minutes: number | null) {
	if (minutes == null) return null;
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function MealPlanRecipePickerModal({
	open,
	onOpenChange,
	onPick,
}: MealPlanRecipePickerModalProps) {
	const { data: recipes } = useRecipes();
	const { data: categories } = useRecipeCategories();
	const { data: availability } = useRecipeAvailability();
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		if (!recipes) return [];
		const term = search.trim().toLowerCase();
		if (!term) return recipes;
		return recipes.filter((r) => r.name.toLowerCase().includes(term));
	}, [recipes, search]);

	function categoryNames(ids: string[]) {
		return ids
			.map((id) => categories?.find((c) => c.id === id)?.name)
			.filter(Boolean) as string[];
	}

	function handlePick(recipeId: string) {
		onPick(recipeId);
		onOpenChange(false);
		setSearch("");
	}

	return (
		<Modal open={open} onOpenChange={onOpenChange} title="Add a recipe">
			<div className="mb-3">
				<SearchInput
					placeholder="Search recipes…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					onClear={() => setSearch("")}
				/>
			</div>

			{!recipes?.length ? (
				<p className="py-6 text-center text-sm text-(--sea-ink-soft)">
					No recipes yet —{" "}
					<Link
						to="/recipes"
						className="font-medium text-(--lagoon-deep) underline"
					>
						create one
					</Link>
					.
				</p>
			) : !filtered.length ? (
				<p className="py-6 text-center text-sm text-(--sea-ink-soft)">
					No recipes match your search.
				</p>
			) : (
				<ul className="-mx-2 max-h-[60vh] overflow-y-auto">
					{filtered.map((r) => {
						const cats = categoryNames(r.categoryIds);
						const status = availability?.[r.id];
						const prep = formatTime(r.prepTime);
						const cook = formatTime(r.cookTime);
						return (
							<li key={r.id}>
								<button
									type="button"
									onClick={() => handlePick(r.id)}
									className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-(--surface)"
								>
									{r.image ? (
										<img
											src={r.image}
											alt=""
											className="h-10 w-10 shrink-0 rounded object-cover"
										/>
									) : (
										<div className="h-10 w-10 shrink-0 rounded bg-(--code-bg)" />
									)}
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold text-(--sea-ink)">
											{r.name}
										</p>
										<div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-(--sea-ink-soft)">
											{cats.length > 0 && (
												<span className="truncate">{cats.join(", ")}</span>
											)}
											{r.servings != null && <span>{r.servings} servings</span>}
											{prep && <span>Prep {prep}</span>}
											{cook && <span>Cook {cook}</span>}
										</div>
									</div>
									{status === "sufficient" && (
										<CircleCheck
											size={16}
											className="shrink-0 text-emerald-500"
										/>
									)}
									{status === "deficit" && (
										<CircleX size={16} className="shrink-0 text-red-500" />
									)}
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</Modal>
	);
}
