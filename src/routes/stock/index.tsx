import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UtensilsCrossed } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Accordion } from "#src/components/Accordion";
import { Button } from "#src/components/Button";
import { Combobox } from "#src/components/Combobox";
import { DatePicker } from "#src/components/DatePicker";
import { Island } from "#src/components/Island";
import { Modal } from "#src/components/Modal";
import { NumberInput } from "#src/components/NumberInput";
import { Page } from "#src/components/Page";
import { SearchInput } from "#src/components/SearchInput";
import { AmberButton } from "#src/components/stock/AmberButton";
import { QuickAddStock } from "#src/components/stock/QuickAddStock";
import { StockActivityRow } from "#src/components/stock/StockActivityRow";
import { StockProductContent } from "#src/components/stock/StockProductContent";
import { StockProductTrigger } from "#src/components/stock/StockProductTrigger";
import { useToast } from "#src/components/Toast";
import { authClient } from "#src/lib/auth-client";
import { useBrands, useCreateBrand } from "#src/lib/hooks/use-brands";
import { useProductCategories } from "#src/lib/hooks/use-categories";
import { useProductUnitConversions } from "#src/lib/hooks/use-product-unit-conversions";
import { useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import {
	type StockEntry,
	useConsumeStock,
	useDeleteStockEntry,
	useStockEntries,
	useUpdateStockEntry,
} from "#src/lib/hooks/use-stock-entries";
import { useStockLogs } from "#src/lib/hooks/use-stock-logs";
import { useStores } from "#src/lib/hooks/use-stores";
import { useUnitConversions } from "#src/lib/hooks/use-unit-conversions";
import {
	buildConversionGraph,
	tryConvert,
} from "#src/lib/recipe-utils/conversion-graph";
import { pickBestEntry } from "#src/lib/stock-utils";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/stock/")({ component: StockPage });

function StockPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: products } = useProducts();
	const { data: categories } = useProductCategories();
	const { data: brands } = useBrands();
	const { data: stores } = useStores();
	const { data: quantityUnits } = useQuantityUnits();
	const { data: stockEntries, isLoading: entriesLoading } = useStockEntries();
	const { data: stockLogs } = useStockLogs();
	const { data: globalConversions } = useUnitConversions();
	const productIds = (products ?? []).map((p) => p.id);
	const { data: productConversions } = useProductUnitConversions(productIds);
	const deleteStockEntry = useDeleteStockEntry();
	const consumeStock = useConsumeStock();

	const toast = useToast();
	const [search, setSearch] = useState("");
	const [consumeAmounts, setConsumeAmounts] = useState<Record<string, string>>(
		{},
	);
	const [editingEntry, setEditingEntry] = useState<StockEntry | null>(null);
	const [activeTab, setActiveTab] = useState<"stock" | "activity">("stock");

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleConsume(stockEntryId: string) {
		const amount = consumeAmounts[stockEntryId] ?? "1";
		if (!amount) return;
		const entry = (stockEntries ?? []).find((e) => e.id === stockEntryId);
		const name = entry ? getProductName(entry.productId) : "Stock";
		try {
			await consumeStock.mutateAsync({ stockEntryId, quantity: amount });
			toast.success(`${name} consumed`);
		} catch {
			toast.error(`Failed to consume ${name}`);
		}
	}

	async function handleQuickConsume(entries: StockEntry[], amount: number) {
		const best = pickBestEntry(entries);
		if (!best) return;
		const name = getProductName(best.productId);
		try {
			await consumeStock.mutateAsync({
				stockEntryId: best.id,
				quantity: amount.toString(),
			});
			toast.success(`${name} consumed`);
		} catch {
			toast.error(`Failed to consume ${name}`);
		}
	}

	function getProductName(id: string) {
		return products?.find((p) => p.id === id)?.name ?? "Unknown";
	}

	function getUnitAbbr(unitId: string | null) {
		if (!unitId) return "";
		const unit = quantityUnits?.find((u) => u.id === unitId);
		return unit?.abbreviation ?? unit?.name ?? "";
	}

	function getCategoryName(categoryIds: string[]) {
		const names = categoryIds
			.map((id) => categories?.find((c) => c.id === id)?.name)
			.filter(Boolean) as string[];
		return names.length > 0 ? names.join(", ") : null;
	}

	// Group stock entries by product
	const entriesByProduct = new Map<string, StockEntry[]>();
	for (const entry of stockEntries ?? []) {
		const existing = entriesByProduct.get(entry.productId) ?? [];
		existing.push(entry);
		entriesByProduct.set(entry.productId, existing);
	}

	// Build product stock summaries
	const productStockList = (products ?? []).map((p) => {
		const entries = entriesByProduct.get(p.id) ?? [];
		const totalStock = entries.reduce(
			(sum, e) => sum + Number.parseFloat(e.quantity),
			0,
		);
		return { product: p, entries, totalStock };
	});

	const filteredProductStockList = search.trim()
		? productStockList.filter((item) =>
				item.product.name.toLowerCase().includes(search.toLowerCase()),
			)
		: productStockList;

	const recentLogs = [...(stockLogs ?? [])]
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)
		.slice(0, 20);

	return (
		<Page as="main" className="sm:pb-8 sm:pt-14">
			<Island
				as="section"
				className="animate-rise-in sm:rounded-2xl p-6 sm:p-8"
			>
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Inventory
				</p>
				<h1 className="font-display mb-6 text-3xl font-bold text-(--sea-ink)">
					Stock
				</h1>

				<QuickAddStock
					products={products ?? []}
					stores={stores ?? []}
					brands={brands ?? []}
					quantityUnits={quantityUnits ?? []}
					productConversions={productConversions ?? []}
					globalConversions={globalConversions ?? []}
				/>

				{/* Tab bar */}
				<nav className="mb-6 flex gap-4 text-sm font-semibold">
					<button
						type="button"
						onClick={() => setActiveTab("stock")}
						className={cn(
							"relative no-underline after:content-[''] after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[linear-gradient(90deg,var(--lagoon),#7ed3bf)] after:transition-transform after:duration-170 hover:text-(--sea-ink) hover:after:scale-x-100",
							activeTab === "stock"
								? "text-(--sea-ink) after:scale-x-100"
								: "text-(--sea-ink-soft)",
						)}
					>
						Stock
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("activity")}
						className={cn(
							"relative no-underline after:content-[''] after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[linear-gradient(90deg,var(--lagoon),#7ed3bf)] after:transition-transform after:duration-170 hover:text-(--sea-ink) hover:after:scale-x-100",
							activeTab === "activity"
								? "text-(--sea-ink) after:scale-x-100"
								: "text-(--sea-ink-soft)",
						)}
					>
						Recent Activity
					</button>
				</nav>

				{activeTab === "stock" && (
					<>
						<div className="mb-4">
							<SearchInput
								placeholder="Search..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								onClear={() => setSearch("")}
							/>
						</div>

						{/* Product stock list */}
						{entriesLoading ? (
							<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
						) : !productStockList.length ? (
							<p className="text-sm text-(--sea-ink-soft)">
								No products yet. Add stock above!
							</p>
						) : !filteredProductStockList.length ? (
							<p className="text-sm text-(--sea-ink-soft)">
								No products match your search.
							</p>
						) : (
							<Accordion
								items={filteredProductStockList.map((item) => ({
									...item,
									key: item.product.id,
								}))}
								renderTrigger={(item) => (
									<StockProductTrigger
										product={item.product}
										totalStock={item.totalStock}
										unitAbbr={getUnitAbbr(item.product.defaultQuantityUnitId)}
										categoryName={getCategoryName(item.product.categoryIds)}
									/>
								)}
								renderAction={(item) => {
									const amount = item.product.defaultConsumeAmount
										? Number.parseFloat(item.product.defaultConsumeAmount)
										: 1;
									return (
										<AmberButton
											type="button"
											onClick={() => handleQuickConsume(item.entries, amount)}
											disabled={consumeStock.isPending || item.totalStock <= 0}
											title={`Consume ${amount}`}
											className="flex shrink-0 items-center gap-1"
										>
											<UtensilsCrossed size={12} className="sm:hidden" />
											<span className="hidden sm:inline">Consume {amount}</span>
										</AmberButton>
									);
								}}
								renderContent={(item) => (
									<StockProductContent
										entries={item.entries}
										unitAbbr={getUnitAbbr(item.product.defaultQuantityUnitId)}
										consumeAmounts={consumeAmounts}
										onConsumeAmountChange={(entryId, value) =>
											setConsumeAmounts((prev) => ({
												...prev,
												[entryId]: value,
											}))
										}
										onConsume={handleConsume}
										consumePending={consumeStock.isPending}
										onEdit={setEditingEntry}
										onDelete={(id) => deleteStockEntry.mutate(id)}
										deletePending={deleteStockEntry.isPending}
										storeNames={Object.fromEntries(
											(stores ?? []).map((s) => [s.id, s.name]),
										)}
										brandNames={Object.fromEntries(
											(brands ?? []).map((b) => [b.id, b.name]),
										)}
									/>
								)}
							/>
						)}
					</>
				)}

				{activeTab === "activity" &&
					(recentLogs.length > 0 ? (
						<div className="flex flex-col gap-1">
							{recentLogs.map((log) => (
								<StockActivityRow
									key={log.id}
									transactionType={log.transactionType}
									productName={getProductName(log.productId)}
									quantity={log.quantity}
									unitAbbr={getUnitAbbr(
										products?.find((p) => p.id === log.productId)
											?.defaultQuantityUnitId ?? null,
									)}
									createdAt={log.createdAt}
								/>
							))}
						</div>
					) : (
						<p className="text-sm text-(--sea-ink-soft)">No recent activity.</p>
					))}
			</Island>
			{editingEntry && (
				<EditStockModal
					entry={editingEntry}
					stores={stores ?? []}
					brands={brands ?? []}
					defaultUnitId={
						products?.find((p) => p.id === editingEntry.productId)
							?.defaultQuantityUnitId ?? null
					}
					quantityUnits={quantityUnits ?? []}
					productConversions={(productConversions ?? []).filter(
						(c) => c.productId === editingEntry.productId,
					)}
					globalConversions={globalConversions ?? []}
					onClose={() => setEditingEntry(null)}
				/>
			)}
		</Page>
	);
}

function EditStockModal({
	entry,
	stores,
	brands,
	defaultUnitId,
	quantityUnits,
	productConversions,
	globalConversions,
	onClose,
}: {
	entry: StockEntry;
	stores: { id: string; name: string }[];
	brands: { id: string; name: string }[];
	defaultUnitId: string | null;
	quantityUnits: { id: string; abbreviation: string | null; name: string }[];
	productConversions: {
		fromUnitId: string;
		toUnitId: string;
		factor: string | number;
	}[];
	globalConversions: {
		fromUnitId: string;
		toUnitId: string;
		factor: string | number;
	}[];
	onClose: () => void;
}) {
	const updateStockEntry = useUpdateStockEntry(entry.id);
	const deleteStockEntry = useDeleteStockEntry();
	const createBrand = useCreateBrand();
	const [quantity, setQuantity] = useState(entry.quantity);
	const [unitId, setUnitId] = useState(defaultUnitId ?? "");
	const [expirationDate, setExpirationDate] = useState(
		entry.expirationDate?.slice(0, 10) ?? "",
	);
	const [purchaseDate, setPurchaseDate] = useState(
		entry.purchaseDate?.slice(0, 10) ?? "",
	);
	const [price, setPrice] = useState(entry.price ?? "");
	const [storeId, setStoreId] = useState(entry.storeId ?? "");
	const [brandId, setBrandId] = useState(entry.brandId ?? "");

	const allConversions = [...productConversions, ...globalConversions];
	const graph = buildConversionGraph(allConversions);

	const convertibleUnitIds = new Set<string>();
	if (defaultUnitId) {
		convertibleUnitIds.add(defaultUnitId);
		const edges = graph.get(defaultUnitId);
		if (edges) {
			for (const neighborId of edges.keys()) {
				convertibleUnitIds.add(neighborId);
			}
		}
	}

	const unitOptions = quantityUnits
		.filter((u) => convertibleUnitIds.has(u.id))
		.map((u) => ({
			value: u.id,
			label: u.abbreviation ?? u.name,
		}));

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();

		let finalQuantity = quantity;
		if (unitId && defaultUnitId && unitId !== defaultUnitId) {
			const converted = tryConvert(
				graph,
				Number.parseFloat(quantity),
				unitId,
				defaultUnitId,
			);
			if (converted === null) return;
			finalQuantity = String(converted);
		}

		await updateStockEntry.mutateAsync({
			quantity: finalQuantity,
			expirationDate: expirationDate || undefined,
			purchaseDate: purchaseDate || undefined,
			price: price || undefined,
			storeId: storeId || undefined,
			brandId: brandId || undefined,
		});
		onClose();
	}

	return (
		<Modal
			open
			onOpenChange={(open) => !open && onClose()}
			title="Edit Stock Entry"
		>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<label className="flex flex-col gap-1 text-sm font-medium text-(--sea-ink)">
					Quantity
					<div className="flex items-center gap-2">
						<NumberInput
							required
							step="any"
							min="0.01"
							value={quantity}
							onChange={(e) => setQuantity(e.target.value)}
							className="flex-1"
						/>
						{unitOptions.length > 1 ? (
							<Combobox
								value={unitId}
								onChange={setUnitId}
								options={unitOptions}
								placeholder="Unit"
								portal
								className="w-24"
							/>
						) : unitOptions.length === 1 ? (
							<span className="text-xs text-(--sea-ink-soft)">
								{unitOptions[0].label}
							</span>
						) : null}
					</div>
				</label>
				<label className="flex flex-col gap-1 text-sm font-medium text-(--sea-ink)">
					Expiration Date
					<DatePicker
						value={expirationDate}
						onChange={setExpirationDate}
						placeholder="No expiration"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm font-medium text-(--sea-ink)">
					Purchase Date
					<DatePicker
						value={purchaseDate}
						onChange={setPurchaseDate}
						placeholder="No purchase date"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm font-medium text-(--sea-ink)">
					Price
					<NumberInput
						step="0.01"
						min="0"
						value={price}
						onChange={(e) => setPrice(e.target.value)}
						placeholder="Price"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm font-medium text-(--sea-ink)">
					Store
					<Combobox
						value={storeId}
						onChange={setStoreId}
						options={stores.map((s) => ({
							value: s.id,
							label: s.name,
						}))}
						placeholder="Select store"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm font-medium text-(--sea-ink)">
					Brand
					<Combobox
						value={brandId}
						onChange={setBrandId}
						options={brands.map((b) => ({
							value: b.id,
							label: b.name,
						}))}
						placeholder="Select brand"
						onCreateNew={async (name) => {
							const created = await createBrand.mutateAsync({ name });
							setBrandId(created.id);
						}}
					/>
				</label>
				<div className="flex items-center gap-2 pt-2">
					<button
						type="button"
						onClick={async () => {
							await deleteStockEntry.mutateAsync(entry.id);
							onClose();
						}}
						disabled={deleteStockEntry.isPending}
						className="h-10 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
					>
						{deleteStockEntry.isPending ? "Deleting…" : "Delete"}
					</button>
					<div className="ml-auto flex gap-2">
						<button
							type="button"
							onClick={onClose}
							className="h-10 rounded-full border border-(--line) px-4 text-sm font-semibold text-(--sea-ink-soft) transition hover:bg-(--line)"
						>
							Cancel
						</button>
						<Button
							type="submit"
							disabled={updateStockEntry.isPending}
							className="flex items-center gap-1.5"
						>
							Save Changes
						</Button>
					</div>
				</div>
			</form>
		</Modal>
	);
}
