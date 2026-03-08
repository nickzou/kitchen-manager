import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Grid3x3, List, Plus, Rows3 } from "lucide-react";
import { useState } from "react";
import InventorySubNav from "#/components/InventorySubNav";
import { Page } from "#/components/Page";
import { authClient } from "#/lib/auth-client";
import {
	type Category,
	useCategories,
	useCreateCategory,
} from "#/lib/hooks/use-categories";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/categories/")({
	component: CategoriesPage,
});

type ViewMode = "grid" | "table" | "compact";

function CategoriesPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: categories, isLoading } = useCategories();
	const createCategory = useCreateCategory();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await createCategory.mutateAsync({
			name: name.trim(),
			description: description.trim() || undefined,
		});
		setName("");
		setDescription("");
	}

	const inputClass =
		"h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	return (
		<Page as="main" className="px-4 pb-8 pt-14">
			<section className="island-shell rise-in rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Organization</p>
				<h1 className="display-title mb-6 text-3xl font-bold text-(--sea-ink)">
					Categories
				</h1>

				<InventorySubNav />

				<form
					onSubmit={handleSubmit}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<input
						type="text"
						placeholder="Category name *"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={cn(inputClass, "flex-1 min-w-[160px]")}
					/>
					<input
						type="text"
						placeholder="Description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className={cn(inputClass, "w-48")}
					/>
					<button
						type="submit"
						disabled={createCategory.isPending}
						className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon-deep) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						<Plus size={16} />
						Add
					</button>
				</form>

				<div className="mb-4 flex items-center gap-1">
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

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
				) : !categories?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No categories yet. Add one above!
					</p>
				) : view === "grid" ? (
					<GridView categories={categories} />
				) : view === "table" ? (
					<TableView categories={categories} />
				) : (
					<CompactView categories={categories} />
				)}
			</section>
		</Page>
	);
}

function formatDate(dateStr: string | null) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString();
}

function GridView({ categories }: { categories: Category[] }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{categories.map((c) => (
				<Link
					key={c.id}
					to="/categories/$id"
					params={{ id: c.id }}
					className="island-shell block rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
				>
					<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
						{c.name}
					</h3>
					{c.description && (
						<p className="m-0 text-xs text-(--sea-ink-soft)">{c.description}</p>
					)}
				</Link>
			))}
		</div>
	);
}

function TableView({ categories }: { categories: Category[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b border-(--line) text-xs font-semibold uppercase tracking-wide text-(--sea-ink-soft)">
						<th className="pb-2 pr-4">Name</th>
						<th className="pb-2 pr-4">Description</th>
						<th className="pb-2">Created</th>
					</tr>
				</thead>
				<tbody>
					{categories.map((c) => (
						<tr key={c.id} className="border-b border-(--line) last:border-0">
							<td className="py-2.5 pr-4">
								<Link
									to="/categories/$id"
									params={{ id: c.id }}
									className="font-medium text-(--lagoon-deep) no-underline hover:underline"
								>
									{c.name}
								</Link>
							</td>
							<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
								{c.description || "—"}
							</td>
							<td className="py-2.5 text-(--sea-ink-soft)">
								{formatDate(c.createdAt)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CompactView({ categories }: { categories: Category[] }) {
	return (
		<div className="flex flex-col gap-1">
			{categories.map((c) => (
				<Link
					key={c.id}
					to="/categories/$id"
					params={{ id: c.id }}
					className="flex items-center justify-between rounded-lg px-3 py-2 no-underline transition hover:bg-(--surface)"
				>
					<span className="text-sm font-medium text-(--sea-ink)">{c.name}</span>
					<span className="text-xs text-(--sea-ink-soft)">
						{c.description || "—"}
					</span>
				</Link>
			))}
		</div>
	);
}
