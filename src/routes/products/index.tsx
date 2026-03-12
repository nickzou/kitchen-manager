import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { CompactView } from "#src/components/CompactView";
import { GridView } from "#src/components/GridView";
import InventorySubNav from "#src/components/InventorySubNav";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { SearchInput } from "#src/components/SearchInput";
import { TableView } from "#src/components/TableView";
import { type ViewMode, ViewSwitcher } from "#src/components/ViewSwitcher";
import { authClient } from "#src/lib/auth-client";
import { formatDate } from "#src/lib/format-date";
import { useCategories } from "#src/lib/hooks/use-categories";
import { useCreateProduct, useProducts } from "#src/lib/hooks/use-products";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/products/")({ component: ProductsPage });

function ProductsPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: products, isLoading } = useProducts();
	const { data: categories } = useCategories();
	const createProduct = useCreateProduct();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [search, setSearch] = useState("");

	const filteredProducts = useMemo(() => {
		if (!products || !search.trim()) return products;
		const term = search.toLowerCase();
		return products.filter((p) => p.name.toLowerCase().includes(term));
	}, [products, search]);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await createProduct.mutateAsync({
			name: name.trim(),
			categoryId: categoryId || undefined,
		});
		setName("");
		setCategoryId("");
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
					Inventory
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Products
				</h1>

				<InventorySubNav />

				<form
					onSubmit={handleSubmit}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<input
						type="text"
						placeholder="Product name *"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={cn(inputClass, "flex-1 min-w-[160px]")}
					/>
					<select
						value={categoryId}
						onChange={(e) => setCategoryId(e.target.value)}
						className={cn(inputClass, "w-40")}
					>
						<option value="">Category</option>
						{(categories ?? []).map((c) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
					<button
						type="submit"
						disabled={createProduct.isPending}
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
					<ViewSwitcher view={view} onViewChange={setView} />
				</div>

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
				) : !products?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No products yet. Add one above!
					</p>
				) : !filteredProducts?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No products match your search.
					</p>
				) : view === "grid" ? (
					<GridView
						items={filteredProducts}
						getKey={(p) => p.id}
						getLink={(p) => ({ to: "/products/$id", params: { id: p.id } })}
						getImage={(p) => p.image}
						getImageAlt={(p) => p.name}
						renderCard={(p) => {
							const catName = getCategoryName(p.categoryId);
							return (
								<>
									<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
										{p.name}
									</h3>
									{catName && (
										<span className="mb-2 inline-block rounded-full bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-medium text-(--lagoon-deep)">
											{catName}
										</span>
									)}
									{Number.parseFloat(p.minStockAmount) > 0 && (
										<p className="m-0 text-xs text-(--sea-ink-soft)">
											Min stock: {p.minStockAmount}
										</p>
									)}
								</>
							);
						}}
					/>
				) : view === "table" ? (
					<TableView
						columns={[
							{ label: "Name" },
							{ label: "Category" },
							{ label: "Min Stock" },
							{ label: "Created" },
						]}
						items={filteredProducts}
						getKey={(p) => p.id}
						renderRow={(p) => (
							<>
								<td className="py-2.5 pr-4">
									<Link
										to="/products/$id"
										params={{ id: p.id }}
										className="font-medium text-(--lagoon-deep) no-underline hover:underline"
									>
										{p.name}
									</Link>
								</td>
								<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
									{getCategoryName(p.categoryId) || "—"}
								</td>
								<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
									{Number.parseFloat(p.minStockAmount) > 0
										? p.minStockAmount
										: "—"}
								</td>
								<td className="py-2.5 text-(--sea-ink-soft)">
									{formatDate(p.createdAt)}
								</td>
							</>
						)}
					/>
				) : (
					<CompactView
						items={filteredProducts}
						getKey={(p) => p.id}
						getLink={(p) => ({ to: "/products/$id", params: { id: p.id } })}
						getName={(p) => p.name}
						getSecondary={(p) => getCategoryName(p.categoryId) || "—"}
					/>
				)}
			</Island>
		</Page>
	);
}
