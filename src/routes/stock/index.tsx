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
import { StockProductContent } from "#src/components/stock/StockProductContent";
import { StockProductTrigger } from "#src/components/stock/StockProductTrigger";
import { authClient } from "#src/lib/auth-client";
import { useBrands, useCreateBrand } from "#src/lib/hooks/use-brands";
import { useProductCategories } from "#src/lib/hooks/use-categories";
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
	const deleteStockEntry = useDeleteStockEntry();
	const consumeStock = useConsumeStock();

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
		await consumeStock.mutateAsync({ stockEntryId, quantity: amount });
	}

	async function handleQuickConsume(entries: StockEntry[], amount: number) {
		const best = pickBestEntry(entries);
		if (!best) return;
		await consumeStock.mutateAsync({
			stockEntryId: best.id,
			quantity: amount.toString(),
		});
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

	const transactionBadgeClass: Record<string, string> = {
		add: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		consume:
			"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
		remove: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	};

	return (
		<Page as="main" className="pb-8 pt-14">
			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
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
				/>

				{/* Tab bar */}
				<nav className="mb-6 flex gap-4 text-sm font-semibold">
					<button
						type="button"
						onClick={() => setActiveTab("stock")}
						className={cn(
							"relative no-underline after:content-[''] after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[linear-gradient(90deg,var(--lagoon),#7ed3bf)] after:transition-transform after:duration-[170ms] hover:text-(--sea-ink) hover:after:scale-x-100",
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
							"relative no-underline after:content-[''] after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[linear-gradient(90deg,var(--lagoon),#7ed3bf)] after:transition-transform after:duration-[170ms] hover:text-(--sea-ink) hover:after:scale-x-100",
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
								<div
									key={log.id}
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
								>
									<span
										className={cn(
											"w-[4.5rem] shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold capitalize",
											transactionBadgeClass[log.transactionType],
										)}
									>
										{log.transactionType}
									</span>
									<div className="flex min-w-0 flex-1 flex-col">
										<span className="font-medium text-(--sea-ink)">
											{getProductName(log.productId)}
										</span>
										<span className="text-xs text-(--sea-ink-soft)">
											{new Date(log.createdAt).toLocaleString()}
										</span>
									</div>
									<span className="shrink-0 text-(--sea-ink-soft)">
										{log.quantity}
										{getUnitAbbr(
											products?.find((p) => p.id === log.productId)
												?.defaultQuantityUnitId ?? null,
										)
											? ` ${getUnitAbbr(products?.find((p) => p.id === log.productId)?.defaultQuantityUnitId ?? null)}`
											: ""}
									</span>
								</div>
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
					unitAbbr={getUnitAbbr(
						products?.find((p) => p.id === editingEntry.productId)
							?.defaultQuantityUnitId ?? null,
					)}
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
	unitAbbr,
	onClose,
}: {
	entry: StockEntry;
	stores: { id: string; name: string }[];
	brands: { id: string; name: string }[];
	unitAbbr: string;
	onClose: () => void;
}) {
	const updateStockEntry = useUpdateStockEntry(entry.id);
	const deleteStockEntry = useDeleteStockEntry();
	const createBrand = useCreateBrand();
	const [quantity, setQuantity] = useState(entry.quantity);
	const [expirationDate, setExpirationDate] = useState(
		entry.expirationDate?.slice(0, 10) ?? "",
	);
	const [purchaseDate, setPurchaseDate] = useState(
		entry.purchaseDate?.slice(0, 10) ?? "",
	);
	const [price, setPrice] = useState(entry.price ?? "");
	const [storeId, setStoreId] = useState(entry.storeId ?? "");
	const [brandId, setBrandId] = useState(entry.brandId ?? "");

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		await updateStockEntry.mutateAsync({
			quantity,
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
						{unitAbbr && (
							<span className="text-xs text-(--sea-ink-soft)">{unitAbbr}</span>
						)}
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
