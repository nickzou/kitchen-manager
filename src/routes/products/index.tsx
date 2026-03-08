import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Grid3x3, List, Plus, Rows3 } from "lucide-react";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";
import {
	type Product,
	useCreateProduct,
	useProducts,
} from "#/lib/hooks/use-products";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/products/")({ component: ProductsPage });

type ViewMode = "grid" | "table" | "compact";

function ProductsPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: products, isLoading } = useProducts();
	const createProduct = useCreateProduct();

	const [view, setView] = useState<ViewMode>("grid");
	const [name, setName] = useState("");
	const [category, setCategory] = useState("");
	const [expirationDate, setExpirationDate] = useState("");

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await createProduct.mutateAsync({
			name: name.trim(),
			category: category.trim() || undefined,
			expirationDate: expirationDate || undefined,
		});
		setName("");
		setCategory("");
		setExpirationDate("");
	}

	const inputClass =
		"h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<section className="island-shell rise-in rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Inventory</p>
				<h1 className="display-title mb-6 text-3xl font-bold text-(--sea-ink)">
					Products
				</h1>

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
					<input
						type="text"
						placeholder="Category"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className={cn(inputClass, "w-40")}
					/>
					<input
						type="date"
						value={expirationDate}
						onChange={(e) => setExpirationDate(e.target.value)}
						className={cn(inputClass, "w-40")}
					/>
					<button
						type="submit"
						disabled={createProduct.isPending}
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
				) : !products?.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No products yet. Add one above!
					</p>
				) : view === "grid" ? (
					<GridView products={products} />
				) : view === "table" ? (
					<TableView products={products} />
				) : (
					<CompactView products={products} />
				)}
			</section>
		</main>
	);
}

function formatDate(dateStr: string | null) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString();
}

function GridView({ products }: { products: Product[] }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{products.map((p) => (
				<Link
					key={p.id}
					to="/products/$id"
					params={{ id: p.id }}
					className="island-shell block rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
				>
					<h3 className="mb-1 text-sm font-semibold text-(--sea-ink)">
						{p.name}
					</h3>
					{p.category && (
						<span className="mb-2 inline-block rounded-full bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-medium text-(--lagoon-deep)">
							{p.category}
						</span>
					)}
					<p className="m-0 text-xs text-(--sea-ink-soft)">
						Expires: {formatDate(p.expirationDate)}
					</p>
				</Link>
			))}
		</div>
	);
}

function TableView({ products }: { products: Product[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b border-(--line) text-xs font-semibold uppercase tracking-wide text-(--sea-ink-soft)">
						<th className="pb-2 pr-4">Name</th>
						<th className="pb-2 pr-4">Category</th>
						<th className="pb-2 pr-4">Expiration</th>
						<th className="pb-2">Created</th>
					</tr>
				</thead>
				<tbody>
					{products.map((p) => (
						<tr key={p.id} className="border-b border-(--line) last:border-0">
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
								{p.category || "—"}
							</td>
							<td className="py-2.5 pr-4 text-(--sea-ink-soft)">
								{formatDate(p.expirationDate)}
							</td>
							<td className="py-2.5 text-(--sea-ink-soft)">
								{formatDate(p.createdAt)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CompactView({ products }: { products: Product[] }) {
	return (
		<div className="flex flex-col gap-1">
			{products.map((p) => (
				<Link
					key={p.id}
					to="/products/$id"
					params={{ id: p.id }}
					className="flex items-center justify-between rounded-lg px-3 py-2 no-underline transition hover:bg-(--surface)"
				>
					<span className="text-sm font-medium text-(--sea-ink)">{p.name}</span>
					<span className="text-xs text-(--sea-ink-soft)">
						{p.category || "—"}
					</span>
				</Link>
			))}
		</div>
	);
}
