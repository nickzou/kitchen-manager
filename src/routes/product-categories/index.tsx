import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Button } from "#src/components/Button";
import { CompactView } from "#src/components/CompactView";
import { GridView } from "#src/components/GridView";
import { Input } from "#src/components/Input";
import InventorySubNav from "#src/components/InventorySubNav";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { SearchInput } from "#src/components/SearchInput";
import { TableView } from "#src/components/TableView";
import { type ViewMode, ViewSwitcher } from "#src/components/ViewSwitcher";
import { authClient } from "#src/lib/auth-client";
import { formatDate } from "#src/lib/format-date";
import {
	useCreateProductCategory,
	useProductCategories,
} from "#src/lib/hooks/use-categories";

export const Route = createFileRoute("/product-categories/")({
	component: ProductCategoriesPage,
});

function ProductCategoriesPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: categories, isLoading } = useProductCategories();
	const createCategory = useCreateProductCategory();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [search, setSearch] = useState("");

	const filteredCategories = useMemo(() => {
		if (!categories || !search.trim()) return categories;
		const term = search.toLowerCase();
		return categories.filter(
			(c) =>
				c.name.toLowerCase().includes(term) ||
				c.description?.toLowerCase().includes(term),
		);
	}, [categories, search]);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await createCategory.mutateAsync({
			name: name.trim(),
			description: description.trim() || undefined,
		});
		setName("");
		setDescription("");
	}

	return (
		<Page as="main" className="pb-8 pt-14">
			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Inventory
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Categories
				</h1>

				<InventorySubNav />

				<form
					onSubmit={handleSubmit}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<Input
						type="text"
						placeholder="Category name *"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="flex-1 min-w-[160px]"
					/>
					<Input
						type="text"
						placeholder="Description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="w-48"
					/>
					<Button
						type="submit"
						disabled={createCategory.isPending}
						className="flex items-center gap-1.5"
					>
						<Plus size={16} />
						Add
					</Button>
				</form>

				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
					<SearchInput
						placeholder="Search..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						onClear={() => setSearch("")}
					/>
					<ViewSwitcher view={view} onViewChange={setView} />
				</div>

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
				) : !categories?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No categories yet. Add one above!
					</p>
				) : !filteredCategories?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No categories match your search.
					</p>
				) : view === "grid" ? (
					<GridView
						items={filteredCategories}
						getKey={(c) => c.id}
						getLink={(c) => ({
							to: "/product-categories/$id",
							params: { id: c.id },
						})}
						renderCard={(c) => (
							<>
								<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
									{c.name}
								</h3>
								{c.description && (
									<p className="m-0 text-xs text-(--sea-ink-soft)">
										{c.description}
									</p>
								)}
							</>
						)}
					/>
				) : view === "table" ? (
					<TableView
						columns={[
							{ label: "Name" },
							{ label: "Description" },
							{ label: "Created" },
						]}
						items={filteredCategories}
						getKey={(c) => c.id}
						renderRow={(c) => (
							<>
								<td className="py-2.5 pr-4">
									<Link
										to="/product-categories/$id"
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
							</>
						)}
					/>
				) : (
					<CompactView
						items={filteredCategories}
						getKey={(c) => c.id}
						getLink={(c) => ({
							to: "/product-categories/$id",
							params: { id: c.id },
						})}
						getName={(c) => c.name}
						getSecondary={(c) => c.description || "—"}
					/>
				)}
			</Island>
		</Page>
	);
}
