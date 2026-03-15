import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleCheck, CircleX, Plus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { CompactView } from "#src/components/CompactView";
import CookingSubNav from "#src/components/CookingSubNav";
import { GridView } from "#src/components/GridView";
import { ImageToggle } from "#src/components/ImageToggle";
import { Island } from "#src/components/Island";
import { MultiCombobox } from "#src/components/MultiCombobox";
import { Page } from "#src/components/Page";
import { SearchInput } from "#src/components/SearchInput";
import { TableView } from "#src/components/TableView";
import { type ViewMode, ViewSwitcher } from "#src/components/ViewSwitcher";
import { authClient } from "#src/lib/auth-client";
import { formatDate } from "#src/lib/format-date";
import { useRecipeCategories } from "#src/lib/hooks/use-categories";
import { useRecipeAvailability } from "#src/lib/hooks/use-recipe-availability";
import { useCreateRecipe, useRecipes } from "#src/lib/hooks/use-recipes";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/recipes/")({ component: RecipesPage });

function formatTime(minutes: number | null) {
	if (minutes == null) return "—";
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function RecipesPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: recipes, isLoading } = useRecipes();
	const { data: categories } = useRecipeCategories();
	const { data: availability } = useRecipeAvailability();
	const createRecipe = useCreateRecipe();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [categoryIds, setCategoryIds] = useState<string[]>([]);
	const [search, setSearch] = useState("");
	const [showImages, setShowImages] = useState(true);

	const filteredRecipes = useMemo(() => {
		if (!recipes || !search.trim()) return recipes;
		const term = search.toLowerCase();
		return recipes.filter((r) => r.name.toLowerCase().includes(term));
	}, [recipes, search]);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await createRecipe.mutateAsync({
			name: name.trim(),
			categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
		});
		setName("");
		setCategoryIds([]);
	}

	function getCategoryNames(catIds: string[]) {
		return catIds
			.map((id) => categories?.find((c) => c.id === id)?.name)
			.filter(Boolean) as string[];
	}

	const inputClass =
		"h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	return (
		<Page as="main" className="pb-8 pt-14">
			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Cooking
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Recipes
				</h1>

				<CookingSubNav />

				<form
					onSubmit={handleSubmit}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<input
						type="text"
						placeholder="Recipe name *"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={cn(inputClass, "flex-1 min-w-[160px]")}
					/>
					<MultiCombobox
						value={categoryIds}
						onChange={setCategoryIds}
						options={(categories ?? []).map((c) => ({
							value: c.id,
							label: c.name,
						}))}
						placeholder="Categories"
						className="w-48"
					/>
					<button
						type="submit"
						disabled={createRecipe.isPending}
						className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						<Plus size={16} />
						Add
					</button>
				</form>

				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
					<SearchInput
						placeholder="Search..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<div className="flex items-center gap-2">
						<ImageToggle
							show={showImages}
							onToggle={() => setShowImages((v) => !v)}
						/>
						<ViewSwitcher view={view} onViewChange={setView} />
					</div>
				</div>

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
				) : !recipes?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No recipes yet. Add one above!
					</p>
				) : !filteredRecipes?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No recipes match your search.
					</p>
				) : view === "grid" ? (
					<GridView
						items={filteredRecipes}
						getKey={(r) => r.id}
						getLink={(r) => ({ to: "/recipes/$id", params: { id: r.id } })}
						getImage={showImages ? (r) => r.image : undefined}
						getImageAlt={showImages ? (r) => r.name : undefined}
						renderCard={(r) => {
							const catNames = getCategoryNames(r.categoryIds);
							return (
								<>
									<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
										{r.name}
									</h3>
									{catNames.length > 0 && (
										<div className="mb-2 flex flex-wrap gap-1">
											{catNames.map((name) => (
												<span
													key={name}
													className="inline-block rounded-full bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-medium text-(--lagoon-deep)"
												>
													{name}
												</span>
											))}
										</div>
									)}
									<div className="flex items-center gap-3 text-xs text-(--sea-ink-soft)">
										{availability?.[r.id] === "sufficient" && (
											<CircleCheck
												size={14}
												className="shrink-0 text-emerald-500"
											/>
										)}
										{availability?.[r.id] === "deficit" && (
											<CircleX size={14} className="shrink-0 text-red-500" />
										)}
										{r.servings != null && <span>{r.servings} servings</span>}
										{r.prepTime != null && (
											<span>Prep {formatTime(r.prepTime)}</span>
										)}
										{r.cookTime != null && (
											<span>Cook {formatTime(r.cookTime)}</span>
										)}
									</div>
								</>
							);
						}}
					/>
				) : view === "table" ? (
					<TableView
						columns={[
							{ label: "Name" },
							{ label: "Stock" },
							{ label: "Category" },
							{ label: "Servings" },
							{ label: "Time" },
							{ label: "Created" },
						]}
						items={filteredRecipes}
						getKey={(r) => r.id}
						renderRow={(r) => (
							<>
								<td className="py-2.5 pr-4">
									<Link
										to="/recipes/$id"
										params={{ id: r.id }}
										className="font-medium text-(--lagoon-deep) no-underline hover:underline"
									>
										{r.name}
									</Link>
								</td>
								<td className="py-2.5 pr-4">
									{availability?.[r.id] === "sufficient" && (
										<CircleCheck size={16} className="text-emerald-500" />
									)}
									{availability?.[r.id] === "deficit" && (
										<CircleX size={16} className="text-red-500" />
									)}
									{(!availability ||
										availability[r.id] === "no-ingredients" ||
										!(r.id in (availability ?? {}))) && (
										<span className="text-(--sea-ink-soft)">—</span>
									)}
								</td>
								<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
									{getCategoryNames(r.categoryIds).join(", ") || "—"}
								</td>
								<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
									{r.servings ?? "—"}
								</td>
								<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
									{r.prepTime != null || r.cookTime != null
										? `${formatTime(r.prepTime)} / ${formatTime(r.cookTime)}`
										: "—"}
								</td>
								<td className="py-2.5 text-(--sea-ink-soft)">
									{formatDate(r.createdAt)}
								</td>
							</>
						)}
					/>
				) : (
					<CompactView
						items={filteredRecipes}
						getKey={(r) => r.id}
						getLink={(r) => ({ to: "/recipes/$id", params: { id: r.id } })}
						getName={(r) => r.name}
						getSecondary={(r) =>
							getCategoryNames(r.categoryIds).join(", ") || "—"
						}
						renderExtra={(r) =>
							availability?.[r.id] === "sufficient" ? (
								<CircleCheck size={14} className="shrink-0 text-emerald-500" />
							) : availability?.[r.id] === "deficit" ? (
								<CircleX size={14} className="shrink-0 text-red-500" />
							) : null
						}
					/>
				)}
			</Island>
		</Page>
	);
}
