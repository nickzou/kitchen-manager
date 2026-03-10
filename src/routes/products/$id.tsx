import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Combobox } from "#src/components/Combobox";
import InventorySubNav from "#src/components/InventorySubNav";
import { Island } from "#src/components/Island";
import { NumberInput } from "#src/components/NumberInput";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";
import { useCategories } from "#src/lib/hooks/use-categories";
import {
	useDeleteProduct,
	useProduct,
	useUpdateProduct,
} from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/products/$id")({
	component: ProductDetail,
});

function ProductDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionLoading } = authClient.useSession();

	const { data: product, isLoading, error } = useProduct(id);
	const { data: categories } = useCategories();
	const { data: quantityUnits } = useQuantityUnits();
	const updateProduct = useUpdateProduct(id);
	const deleteProduct = useDeleteProduct();

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const htmlId = useId();
	const [form, setForm] = useState({
		name: "",
		categoryId: "",
		description: "",
		quantityUnitId: "",
		minStockAmount: "",
		defaultExpirationDays: "",
	});

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	if (isLoading) {
		return (
			<Page as="main" className="pb-8 pt-14">
				<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
			</Page>
		);
	}

	if (error || !product) {
		return (
			<Page as="main" className="pb-8 pt-14">
				<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
					<h1 className="font-display mb-4 text-3xl font-bold text-(--sea-ink)">
						Product not found
					</h1>
					<Link
						to="/products"
						className="text-sm font-medium text-(--lagoon-deep)"
					>
						&larr; Back to products
					</Link>
				</Island>
			</Page>
		);
	}

	function getCategoryName(catId: string | null) {
		if (!catId) return null;
		return categories?.find((c) => c.id === catId)?.name ?? null;
	}

	function getUnitName(unitId: string | null) {
		if (!unitId) return null;
		const unit = quantityUnits?.find((u) => u.id === unitId);
		return unit ? (unit.abbreviation ?? unit.name) : null;
	}

	function startEditing() {
		if (!product) return;
		setForm({
			name: product.name,
			categoryId: product.categoryId || "",
			description: product.description || "",
			quantityUnitId: product.quantityUnitId || "",
			minStockAmount:
				Number.parseFloat(product.minStockAmount) > 0
					? product.minStockAmount
					: "",
			defaultExpirationDays:
				product.defaultExpirationDays != null
					? String(product.defaultExpirationDays)
					: "",
		});
		setEditing(true);
	}

	async function handleSave(e: FormEvent) {
		e.preventDefault();
		await updateProduct.mutateAsync({
			name: form.name,
			categoryId: form.categoryId || undefined,
			description: form.description || undefined,
			quantityUnitId: form.quantityUnitId || undefined,
			minStockAmount: form.minStockAmount || undefined,
			defaultExpirationDays: form.defaultExpirationDays
				? Number.parseInt(form.defaultExpirationDays, 10)
				: undefined,
		});
		setEditing(false);
	}

	async function handleDelete() {
		await deleteProduct.mutateAsync(id);
		navigate({ to: "/products" });
	}

	const inputClass =
		"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	function formatDate(dateStr: string | null) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString();
	}

	const categoryName = getCategoryName(product.categoryId);
	const unitName = getUnitName(product.quantityUnitId);

	return (
		<Page as="main" className="pb-8 pt-14">
			<Link
				to="/products"
				className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-(--lagoon-deep) no-underline hover:underline"
			>
				<ArrowLeft size={14} />
				Back to products
			</Link>

			<InventorySubNav />

			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				{editing ? (
					<form onSubmit={handleSave} className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
								Edit product
							</h1>
							<button
								type="button"
								onClick={() => setEditing(false)}
								className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-(--surface)"
							>
								<X size={18} />
							</button>
						</div>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Name
							<input
								type="text"
								required
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								className={inputClass}
							/>
						</label>

						<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Category
							<Combobox
								value={form.categoryId}
								onChange={(v) => setForm({ ...form, categoryId: v })}
								options={(categories ?? []).map((c) => ({
									value: c.id,
									label: c.name,
								}))}
								placeholder="None"
							/>
						</div>

						<label className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Description
							<textarea
								value={form.description}
								onChange={(e) =>
									setForm({ ...form, description: e.target.value })
								}
								rows={3}
								className={cn(inputClass, "h-auto py-2")}
							/>
						</label>

						<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
							Quantity Unit
							<Combobox
								value={form.quantityUnitId}
								onChange={(v) => setForm({ ...form, quantityUnitId: v })}
								options={(quantityUnits ?? []).map((u) => ({
									value: u.id,
									label: u.abbreviation
										? `${u.name} (${u.abbreviation})`
										: u.name,
								}))}
								placeholder="None"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<label
								htmlFor={`${htmlId}-minStockAmount`}
								className="text-sm font-medium text-(--sea-ink)"
							>
								Min Stock Amount
							</label>
							<NumberInput
								id={`${htmlId}-minStockAmount`}
								step="any"
								min="0"
								value={form.minStockAmount}
								onChange={(e) =>
									setForm({ ...form, minStockAmount: e.target.value })
								}
								className="w-full"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<label
								htmlFor={`${htmlId}-defaultExpirationDays`}
								className="text-sm font-medium text-(--sea-ink)"
							>
								Default Expiration Days
							</label>
							<NumberInput
								id={`${htmlId}-defaultExpirationDays`}
								min="1"
								value={form.defaultExpirationDays}
								onChange={(e) =>
									setForm({ ...form, defaultExpirationDays: e.target.value })
								}
								className="w-full"
							/>
						</div>

						<button
							type="submit"
							disabled={updateProduct.isPending}
							className="mt-2 h-10 rounded-full bg-(--lagoon-deep) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
						>
							{updateProduct.isPending ? "Saving…" : "Save changes"}
						</button>
					</form>
				) : (
					<>
						<div className="mb-6 flex items-start justify-between gap-4">
							<div>
								<h1 className="font-display text-2xl font-bold text-(--sea-ink)">
									{product.name}
								</h1>
								{categoryName && (
									<span className="mt-2 inline-block rounded-full bg-[rgba(79,184,178,0.14)] px-2.5 py-0.5 text-xs font-medium text-(--lagoon-deep)">
										{categoryName}
									</span>
								)}
							</div>
							<div className="flex gap-1">
								<button
									type="button"
									onClick={startEditing}
									className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
									title="Edit"
								>
									<Pencil size={18} />
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(true)}
									className="rounded-lg p-2 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
									title="Delete"
								>
									<Trash2 size={18} />
								</button>
							</div>
						</div>

						{product.description && (
							<p className="mb-4 text-sm text-(--sea-ink-soft)">
								{product.description}
							</p>
						)}

						<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
							{unitName && (
								<div>
									<dt className="font-medium text-(--sea-ink-soft)">Unit</dt>
									<dd className="mt-0.5 text-(--sea-ink)">{unitName}</dd>
								</div>
							)}
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Min Stock</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{Number.parseFloat(product.minStockAmount) > 0
										? product.minStockAmount
										: "—"}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">
									Default Exp. Days
								</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{product.defaultExpirationDays ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Created</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(product.createdAt)}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-(--sea-ink-soft)">Updated</dt>
								<dd className="mt-0.5 text-(--sea-ink)">
									{formatDate(product.updatedAt)}
								</dd>
							</div>
						</dl>

						{confirmDelete && (
							<div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
								<p className="flex-1 text-sm text-red-700 dark:text-red-300">
									Delete this product? This cannot be undone.
								</p>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									className="rounded-lg px-3 py-1.5 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleDelete}
									disabled={deleteProduct.isPending}
									className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
								>
									{deleteProduct.isPending ? "Deleting…" : "Delete"}
								</button>
							</div>
						)}
					</>
				)}
			</Island>
		</Page>
	);
}
