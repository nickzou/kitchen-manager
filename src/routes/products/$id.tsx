import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Combobox } from "#src/components/Combobox";
import { ImageInput } from "#src/components/ImageInput";
import InventorySubNav from "#src/components/InventorySubNav";
import { Island } from "#src/components/Island";
import { DetailColumns } from "#src/components/layouts/DetailColumns";
import { MultiCombobox } from "#src/components/MultiCombobox";
import { NumberInput } from "#src/components/NumberInput";
import { Page } from "#src/components/Page";
import { PricingHistoryChart } from "#src/components/stock/PricingHistoryChart";
import { authClient } from "#src/lib/auth-client";
import { useBrands } from "#src/lib/hooks/use-brands";
import { useProductCategories } from "#src/lib/hooks/use-categories";
import {
	useCreateProductUnitConversion,
	useDeleteProductUnitConversion,
	useProductUnitConversions,
	useUpdateProductUnitConversion,
} from "#src/lib/hooks/use-product-unit-conversions";
import {
	useDeleteProduct,
	useProduct,
	useUpdateProduct,
} from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import { useStockEntries } from "#src/lib/hooks/use-stock-entries";
import { useStores } from "#src/lib/hooks/use-stores";
import { getAvgUnitCost, getLatestUnitCost } from "#src/lib/stock-utils";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/products/$id")({
	component: ProductDetail,
});

function ProductDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionLoading } = authClient.useSession();

	const { data: product, isLoading, error } = useProduct(id);
	const { data: categories } = useProductCategories();
	const { data: quantityUnits } = useQuantityUnits();
	const { data: stockEntries } = useStockEntries(id);
	const { data: stores } = useStores();
	const { data: brands } = useBrands();

	const storeNames: Record<string, string> = {};
	for (const s of stores ?? []) storeNames[s.id] = s.name;
	const brandNames: Record<string, string> = {};
	for (const b of brands ?? []) brandNames[b.id] = b.name;
	const { data: productConversions } = useProductUnitConversions(id);
	const createConversion = useCreateProductUnitConversion(id);
	const deleteConversion = useDeleteProductUnitConversion(id);
	const [editingConversionId, setEditingConversionId] = useState<string | null>(
		null,
	);
	const [editConversion, setEditConversion] = useState({
		fromUnitId: "",
		toUnitId: "",
		factor: "",
	});
	const updateConversion = useUpdateProductUnitConversion(
		id,
		editingConversionId ?? "",
	);
	const updateProduct = useUpdateProduct(id);
	const deleteProduct = useDeleteProduct();

	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const htmlId = useId();
	const [form, setForm] = useState({
		name: "",
		categoryIds: [] as string[],
		description: "",
		image: null as string | null,
		defaultQuantityUnitId: "",
		minStockAmount: "",
		defaultExpirationDays: "",
		defaultConsumeAmount: "",
	});
	const [newConversion, setNewConversion] = useState({
		fromUnitId: "",
		toUnitId: "",
		factor: "",
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

	function getCategoryNames(catIds: string[]) {
		return catIds
			.map((id) => categories?.find((c) => c.id === id)?.name)
			.filter(Boolean) as string[];
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
			categoryIds: [...product.categoryIds],
			description: product.description || "",
			image: product.image,
			defaultQuantityUnitId: product.defaultQuantityUnitId || "",
			minStockAmount:
				Number.parseFloat(product.minStockAmount) > 0
					? product.minStockAmount
					: "",
			defaultExpirationDays:
				product.defaultExpirationDays != null
					? String(product.defaultExpirationDays)
					: "",
			defaultConsumeAmount: product.defaultConsumeAmount ?? "",
		});
		setEditing(true);
	}

	async function handleSave(e: FormEvent) {
		e.preventDefault();
		await updateProduct.mutateAsync({
			name: form.name,
			categoryIds: form.categoryIds,
			description: form.description || undefined,
			image: form.image || undefined,
			defaultQuantityUnitId: form.defaultQuantityUnitId || undefined,
			minStockAmount: form.minStockAmount || undefined,
			defaultExpirationDays: form.defaultExpirationDays
				? Number.parseInt(form.defaultExpirationDays, 10)
				: undefined,
			defaultConsumeAmount: form.defaultConsumeAmount || undefined,
		});
		setEditing(false);
	}

	async function handleDelete() {
		await deleteProduct.mutateAsync(id);
		navigate({ to: "/products" });
	}

	async function handleAddConversion() {
		if (
			!newConversion.fromUnitId ||
			!newConversion.toUnitId ||
			!newConversion.factor
		)
			return;
		await createConversion.mutateAsync({
			fromUnitId: newConversion.fromUnitId,
			toUnitId: newConversion.toUnitId,
			factor: newConversion.factor,
		});
		setNewConversion({ fromUnitId: "", toUnitId: "", factor: "" });
	}

	function startEditingConversion(conv: {
		id: string;
		fromUnitId: string;
		toUnitId: string;
		factor: string;
	}) {
		setEditingConversionId(conv.id);
		setEditConversion({
			fromUnitId: conv.fromUnitId,
			toUnitId: conv.toUnitId,
			factor: conv.factor,
		});
	}

	async function handleSaveConversion() {
		if (
			!editConversion.fromUnitId ||
			!editConversion.toUnitId ||
			!editConversion.factor
		)
			return;
		await updateConversion.mutateAsync({
			fromUnitId: editConversion.fromUnitId,
			toUnitId: editConversion.toUnitId,
			factor: editConversion.factor,
		});
		setEditingConversionId(null);
	}

	async function handleDeleteConversion(conversionId: string) {
		await deleteConversion.mutateAsync(conversionId);
	}

	const inputClass =
		"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

	function formatDate(dateStr: string | null) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString();
	}

	const categoryNames = getCategoryNames(product.categoryIds);
	const unitName = getUnitName(product.defaultQuantityUnitId);
	const avgUnitCost = getAvgUnitCost(stockEntries ?? []);
	const latestUnitCost = getLatestUnitCost(stockEntries ?? []);
	const unitLabel = unitName ?? "unit";

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

			<DetailColumns
				main={
					<Island
						as="section"
						className="animate-rise-in rounded-2xl p-6 sm:p-8"
					>
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
									Categories
									<MultiCombobox
										value={form.categoryIds}
										onChange={(v) => setForm({ ...form, categoryIds: v })}
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

								<ImageInput
									value={form.image}
									onChange={(url) => setForm({ ...form, image: url })}
								/>

								<div className="flex flex-col gap-1.5 text-sm font-medium text-(--sea-ink)">
									Default Quantity Unit
									<Combobox
										value={form.defaultQuantityUnitId}
										onChange={(v) =>
											setForm({ ...form, defaultQuantityUnitId: v })
										}
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
										htmlFor={`${htmlId}-defaultConsumeAmount`}
										className="text-sm font-medium text-(--sea-ink)"
									>
										Default Consume Amount
									</label>
									<NumberInput
										id={`${htmlId}-defaultConsumeAmount`}
										step="any"
										min="0"
										value={form.defaultConsumeAmount}
										onChange={(e) =>
											setForm({ ...form, defaultConsumeAmount: e.target.value })
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
											setForm({
												...form,
												defaultExpirationDays: e.target.value,
											})
										}
										className="w-full"
									/>
								</div>

								<button
									type="submit"
									disabled={updateProduct.isPending}
									className="mt-2 h-10 rounded-full bg-(--lagoon) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
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
										{categoryNames.length > 0 && (
											<div className="mt-2 flex flex-wrap gap-1">
												{categoryNames.map((name) => (
													<span
														key={name}
														className="inline-block rounded-full bg-[rgba(79,184,178,0.14)] px-2.5 py-0.5 text-xs font-medium text-(--lagoon-deep)"
													>
														{name}
													</span>
												))}
											</div>
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

								{product.image && (
									<img
										src={product.image}
										alt={product.name}
										className="mb-4 h-40 w-40 rounded-lg border border-(--line) object-cover"
									/>
								)}

								<dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
									{unitName && (
										<div>
											<dt className="font-medium text-(--sea-ink-soft)">
												Default Unit
											</dt>
											<dd className="mt-0.5 text-(--sea-ink)">{unitName}</dd>
										</div>
									)}
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Min Stock
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											{Number.parseFloat(product.minStockAmount) > 0
												? product.minStockAmount
												: "—"}
										</dd>
									</div>
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Default Consume
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											{product.defaultConsumeAmount
												? Number.parseFloat(product.defaultConsumeAmount)
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
										<dt className="font-medium text-(--sea-ink-soft)">
											Created
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											{formatDate(product.createdAt)}
										</dd>
									</div>
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Updated
										</dt>
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
				}
				side={
					<div className="flex flex-col gap-6">
						<Island
							as="section"
							className="animate-rise-in rounded-2xl p-6 sm:p-8"
						>
							<h2 className="mb-4 text-lg font-semibold text-(--sea-ink)">
								Price Information
							</h2>
							{avgUnitCost != null && latestUnitCost != null && (
								<dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Avg. Unit Cost
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											${avgUnitCost.toFixed(2)} / {unitLabel}
										</dd>
									</div>
									<div>
										<dt className="font-medium text-(--sea-ink-soft)">
											Latest Unit Cost
										</dt>
										<dd className="mt-0.5 text-(--sea-ink)">
											${latestUnitCost.toFixed(2)} / {unitLabel}
										</dd>
									</div>
								</dl>
							)}
							<PricingHistoryChart
								stockEntries={stockEntries ?? []}
								storeNames={storeNames}
								brandNames={brandNames}
							/>
						</Island>
						<Island
							as="section"
							className="animate-rise-in rounded-2xl p-6 sm:p-8"
						>
							<h2 className="mb-4 text-lg font-semibold text-(--sea-ink)">
								Product-Specific Conversions
							</h2>

							{!productConversions?.length ? (
								<p className="mb-4 text-sm text-(--sea-ink-soft)">
									No product-specific conversions yet.
								</p>
							) : (
								<div className="mb-4 flex flex-col gap-2">
									{productConversions.map((conv) =>
										editingConversionId === conv.id ? (
											<div
												key={conv.id}
												className="flex flex-col gap-3 rounded-lg border border-(--lagoon) p-3"
											>
												<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
													<div className="flex flex-col gap-1">
														<span className="text-xs text-(--sea-ink-soft)">
															From
														</span>
														<Combobox
															value={editConversion.fromUnitId}
															onChange={(v) =>
																setEditConversion({
																	...editConversion,
																	fromUnitId: v,
																})
															}
															options={(quantityUnits ?? []).map((u) => ({
																value: u.id,
																label: u.abbreviation
																	? `${u.name} (${u.abbreviation})`
																	: u.name,
															}))}
															placeholder="Unit"
														/>
													</div>
													<div className="flex flex-col gap-1">
														<span className="text-xs text-(--sea-ink-soft)">
															To
														</span>
														<Combobox
															value={editConversion.toUnitId}
															onChange={(v) =>
																setEditConversion({
																	...editConversion,
																	toUnitId: v,
																})
															}
															options={(quantityUnits ?? []).map((u) => ({
																value: u.id,
																label: u.abbreviation
																	? `${u.name} (${u.abbreviation})`
																	: u.name,
															}))}
															placeholder="Unit"
														/>
													</div>
													<div className="flex flex-col gap-1">
														<span className="text-xs text-(--sea-ink-soft)">
															Factor
														</span>
														<NumberInput
															step="any"
															min="0"
															value={editConversion.factor}
															onChange={(e) =>
																setEditConversion({
																	...editConversion,
																	factor: e.target.value,
																})
															}
															className="w-full"
														/>
													</div>
												</div>
												<div className="flex gap-2">
													<button
														type="button"
														onClick={handleSaveConversion}
														disabled={
															!editConversion.fromUnitId ||
															!editConversion.toUnitId ||
															!editConversion.factor ||
															updateConversion.isPending
														}
														className="h-8 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
													>
														{updateConversion.isPending ? "Saving…" : "Save"}
													</button>
													<button
														type="button"
														onClick={() => setEditingConversionId(null)}
														className="h-8 rounded-full px-4 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
													>
														Cancel
													</button>
												</div>
											</div>
										) : (
											<div
												key={conv.id}
												className="flex items-center justify-between rounded-lg border border-(--line) px-3 py-2"
											>
												<span className="text-sm text-(--sea-ink)">
													1 {getUnitName(conv.fromUnitId) ?? "?"} ={" "}
													{conv.factor} {getUnitName(conv.toUnitId) ?? "?"}
												</span>
												<div className="flex gap-1">
													<button
														type="button"
														onClick={() => startEditingConversion(conv)}
														className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
														title="Edit conversion"
													>
														<Pencil size={14} />
													</button>
													<button
														type="button"
														onClick={() => handleDeleteConversion(conv.id)}
														className="rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
														title="Delete conversion"
													>
														<Trash2 size={14} />
													</button>
												</div>
											</div>
										),
									)}
								</div>
							)}

							<div className="flex flex-col gap-3 rounded-lg border border-(--line) p-4">
								<p className="text-sm font-medium text-(--sea-ink)">
									Add conversion
								</p>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
									<div className="flex flex-col gap-1">
										<span className="text-xs text-(--sea-ink-soft)">From</span>
										<Combobox
											value={newConversion.fromUnitId}
											onChange={(v) =>
												setNewConversion({ ...newConversion, fromUnitId: v })
											}
											options={(quantityUnits ?? []).map((u) => ({
												value: u.id,
												label: u.abbreviation
													? `${u.name} (${u.abbreviation})`
													: u.name,
											}))}
											placeholder="Unit"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-xs text-(--sea-ink-soft)">To</span>
										<Combobox
											value={newConversion.toUnitId}
											onChange={(v) =>
												setNewConversion({ ...newConversion, toUnitId: v })
											}
											options={(quantityUnits ?? []).map((u) => ({
												value: u.id,
												label: u.abbreviation
													? `${u.name} (${u.abbreviation})`
													: u.name,
											}))}
											placeholder="Unit"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-xs text-(--sea-ink-soft)">
											Factor
										</span>
										<NumberInput
											step="any"
											min="0"
											value={newConversion.factor}
											onChange={(e) =>
												setNewConversion({
													...newConversion,
													factor: e.target.value,
												})
											}
											className="w-full"
											placeholder="e.g. 120"
										/>
									</div>
								</div>
								<button
									type="button"
									onClick={handleAddConversion}
									disabled={
										!newConversion.fromUnitId ||
										!newConversion.toUnitId ||
										!newConversion.factor ||
										createConversion.isPending
									}
									className="mt-1 h-9 rounded-full bg-(--lagoon) text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
								>
									{createConversion.isPending ? "Adding…" : "Add conversion"}
								</button>
							</div>
						</Island>
					</div>
				}
			/>
		</Page>
	);
}
