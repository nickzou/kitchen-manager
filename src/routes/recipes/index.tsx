import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Grid3x3, List, Plus, Rows3 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { SearchInput } from "#src/components/SearchInput";
import { authClient } from "#src/lib/auth-client";
import { useCategories } from "#src/lib/hooks/use-categories";
import {
	type Recipe,
	useCreateRecipe,
	useRecipes,
} from "#src/lib/hooks/use-recipes";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/recipes/")({ component: RecipesPage });

type ViewMode = "grid" | "table" | "compact";

function RecipesPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: recipes, isLoading } = useRecipes();
	const { data: categories } = useCategories();
	const createRecipe = useCreateRecipe();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [search, setSearch] = useState("");

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
		await createRecipe.mutateAsync({ name: name.trim() });
		setName("");
	}

	function getCategoryName(catId: string | null) {
		if (!catId) return null;
		return categories?.find((c) => c.id === catId)?.name ?? null;
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
					<button
						type="submit"
						disabled={createRecipe.isPending}
						className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon-deep) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
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
					<div className="flex items-center gap-1 sm:ml-auto">
						{(
							[
								["grid", Grid3x3],
								["table", List],
								["compact", Rows3],
							] as const
						).map(([mode, Icon]) => (
							<button
								key={mode}
								type="button"
								onClick={() => setView(mode)}
								className={cn(
									"rounded-lg p-2 transition",
									view === mode
										? "bg-(--lagoon) text-white"
										: "text-(--sea-ink-soft) hover:bg-(--surface)",
								)}
								title={`${mode} view`}
							>
								<Icon size={18} />
							</button>
						))}
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
						recipes={filteredRecipes}
						getCategoryName={getCategoryName}
					/>
				) : view === "table" ? (
					<TableView
						recipes={filteredRecipes}
						getCategoryName={getCategoryName}
					/>
				) : (
					<CompactView
						recipes={filteredRecipes}
						getCategoryName={getCategoryName}
					/>
				)}
			</Island>
		</Page>
	);
}

function formatDate(dateStr: string | null) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString();
}

function formatTime(minutes: number | null) {
	if (minutes == null) return "—";
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type ViewProps = {
	recipes: Recipe[];
	getCategoryName: (id: string | null) => string | null;
};

function GridView({ recipes, getCategoryName }: ViewProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{recipes.map((r) => {
				const catName = getCategoryName(r.categoryId);
				return (
					<Link
						key={r.id}
						to="/recipes/$id"
						params={{ id: r.id }}
						className={`block rounded-xl border border-(--line) bg-linear-165 from-(--surface-strong) to-(--surface) shadow-[inset_0_1px_0_var(--inset-glint),0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] backdrop-blur-xs ${r.image ? "overflow-hidden" : "p-4"} no-underline transition hover:-translate-y-0.5`}
					>
						{r.image && (
							<img
								src={r.image}
								alt={r.name}
								className="h-24 w-full object-cover"
							/>
						)}
						<div className={r.image ? "p-4" : ""}>
							<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
								{r.name}
							</h3>
							{catName && (
								<span className="mb-2 inline-block rounded-full bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-medium text-(--lagoon-deep)">
									{catName}
								</span>
							)}
							<div className="flex gap-3 text-xs text-(--sea-ink-soft)">
								{r.servings != null && <span>{r.servings} servings</span>}
								{r.prepTime != null && (
									<span>Prep {formatTime(r.prepTime)}</span>
								)}
								{r.cookTime != null && (
									<span>Cook {formatTime(r.cookTime)}</span>
								)}
							</div>
						</div>
					</Link>
				);
			})}
		</div>
	);
}

function TableView({ recipes, getCategoryName }: ViewProps) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b border-(--line) text-xs font-semibold uppercase tracking-wide text-(--sea-ink-soft)">
						<th className="pb-2 pr-4">Name</th>
						<th className="pb-2 pr-4">Category</th>
						<th className="pb-2 pr-4">Servings</th>
						<th className="pb-2 pr-4">Time</th>
						<th className="pb-2">Created</th>
					</tr>
				</thead>
				<tbody>
					{recipes.map((r) => (
						<tr key={r.id} className="border-b border-(--line) last:border-0">
							<td className="py-2.5 pr-4">
								<Link
									to="/recipes/$id"
									params={{ id: r.id }}
									className="font-medium text-(--lagoon-deep) no-underline hover:underline"
								>
									{r.name}
								</Link>
							</td>
							<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
								{getCategoryName(r.categoryId) || "—"}
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
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CompactView({ recipes, getCategoryName }: ViewProps) {
	return (
		<div className="flex flex-col gap-1">
			{recipes.map((r) => (
				<Link
					key={r.id}
					to="/recipes/$id"
					params={{ id: r.id }}
					className="flex items-center justify-between rounded-lg px-3 py-2 no-underline transition hover:bg-(--surface)"
				>
					<span className="text-sm font-medium text-(--sea-ink)">{r.name}</span>
					<span className="text-xs text-(--sea-ink-soft)">
						{getCategoryName(r.categoryId) || "—"}
					</span>
				</Link>
			))}
		</div>
	);
}
