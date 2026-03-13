import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Accordion } from "#src/components/Accordion";
import { Combobox } from "#src/components/Combobox";
import { DatePicker } from "#src/components/DatePicker";
import { Island } from "#src/components/Island";
import { Modal } from "#src/components/Modal";
import { NumberInput } from "#src/components/NumberInput";
import { Page } from "#src/components/Page";
import { SearchInput } from "#src/components/SearchInput";
import { StockProductContent } from "#src/components/stock/StockProductContent";
import { StockProductTrigger } from "#src/components/stock/StockProductTrigger";
import { authClient } from "#src/lib/auth-client";
import { useCategories } from "#src/lib/hooks/use-categories";
import { useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import {
	type StockEntry,
	useConsumeStock,
	useCreateStockEntry,
	useStockEntries,
	useUpdateStockEntry,
} from "#src/lib/hooks/use-stock-entries";
import { useStockLogs } from "#src/lib/hooks/use-stock-logs";
import { useStores } from "#src/lib/hooks/use-stores";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/stock/")({ component: StockPage });

function StockPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: products } = useProducts();
	const { data: categories } = useCategories();
	const { data: stores } = useStores();
	const { data: quantityUnits } = useQuantityUnits();
	const { data: stockEntries, isLoading: entriesLoading } = useStockEntries();
	const { data: stockLogs } = useStockLogs();
	const createStockEntry = useCreateStockEntry();
	const consumeStock = useConsumeStock();

	const [productId, setProductId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [expirationDate, setExpirationDate] = useState("");
	const [price, setPrice] = useState("");
	const [storeId, setStoreId] = useState("");
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

	async function handleAddStock(e: FormEvent) {
		e.preventDefault();
		if (!productId || !quantity) return;
		await createStockEntry.mutateAsync({
			productId,
			quantity,
			expirationDate: expirationDate || undefined,
			price: price || undefined,
			storeId: storeId || undefined,
		});
		setQuantity("");
		setExpirationDate("");
		setPrice("");
		setStoreId("");
	}

	async function handleConsume(stockEntryId: string) {
		const amount = consumeAmounts[stockEntryId] ?? "1";
		if (!amount) return;
		await consumeStock.mutateAsync({ stockEntryId, quantity: amount });
	}

	function getProductName(id: string) {
		return products?.find((p) => p.id === id)?.name ?? "Unknown";
	}

	function getUnitAbbr(unitId: string | null) {
		if (!unitId) return "";
		const unit = quantityUnits?.find((u) => u.id === unitId);
		return unit?.abbreviation ?? unit?.name ?? "";
	}

	function getCategoryName(categoryId: string | null) {
		if (!categoryId) return null;
		return categories?.find((c) => c.id === categoryId)?.name ?? null;
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

				{/* Quick-add section */}
				<form
					onSubmit={handleAddStock}
					className="mb-6 flex flex-wrap gap-3 border-b border-(--line) pb-6"
				>
					<Combobox
						value={productId}
						onChange={setProductId}
						options={(products ?? []).map((p) => ({
							value: p.id,
							label: p.name,
						}))}
						placeholder="Select product *"
						required
						className="flex-1 min-w-[160px]"
					/>
					<NumberInput
						placeholder="Quantity *"
						required
						step="any"
						min="0.01"
						value={quantity}
						onChange={(e) => setQuantity(e.target.value)}
						className="w-28"
					/>
					<DatePicker
						value={expirationDate}
						onChange={setExpirationDate}
						placeholder="Expiration"
						className="w-40"
					/>
					<NumberInput
						placeholder="Price"
						step="0.01"
						min="0"
						value={price}
						onChange={(e) => setPrice(e.target.value)}
						className="w-28"
					/>
					<Combobox
						value={storeId}
						onChange={setStoreId}
						options={(stores ?? []).map((s) => ({
							value: s.id,
							label: s.name,
						}))}
						placeholder="Store"
						className="w-40"
					/>
					<button
						type="submit"
						disabled={createStockEntry.isPending}
						className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						<Plus size={16} />
						Add Stock
					</button>
				</form>

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
										unitAbbr={getUnitAbbr(item.product.quantityUnitId)}
										categoryName={getCategoryName(item.product.categoryId)}
									/>
								)}
								renderContent={(item) => (
									<StockProductContent
										entries={item.entries}
										unitAbbr={getUnitAbbr(item.product.quantityUnitId)}
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
										storeNames={Object.fromEntries(
											(stores ?? []).map((s) => [s.id, s.name]),
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
											"rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
											transactionBadgeClass[log.transactionType],
										)}
									>
										{log.transactionType}
									</span>
									<span className="font-medium text-(--sea-ink)">
										{getProductName(log.productId)}
									</span>
									<span className="text-(--sea-ink-soft)">
										{log.quantity}
										{getUnitAbbr(
											products?.find((p) => p.id === log.productId)
												?.quantityUnitId ?? null,
										)
											? ` ${getUnitAbbr(products?.find((p) => p.id === log.productId)?.quantityUnitId ?? null)}`
											: ""}
									</span>
									<span className="ml-auto text-xs text-(--sea-ink-soft)">
										{new Date(log.createdAt).toLocaleString()}
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
					unitAbbr={getUnitAbbr(
						products?.find((p) => p.id === editingEntry.productId)
							?.quantityUnitId ?? null,
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
	unitAbbr,
	onClose,
}: {
	entry: StockEntry;
	stores: { id: string; name: string }[];
	unitAbbr: string;
	onClose: () => void;
}) {
	const updateStockEntry = useUpdateStockEntry(entry.id);
	const [quantity, setQuantity] = useState(entry.quantity);
	const [expirationDate, setExpirationDate] = useState(
		entry.expirationDate?.slice(0, 10) ?? "",
	);
	const [purchaseDate, setPurchaseDate] = useState(
		entry.purchaseDate?.slice(0, 10) ?? "",
	);
	const [price, setPrice] = useState(entry.price ?? "");
	const [storeId, setStoreId] = useState(entry.storeId ?? "");

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		await updateStockEntry.mutateAsync({
			quantity,
			expirationDate: expirationDate || undefined,
			purchaseDate: purchaseDate || undefined,
			price: price || undefined,
			storeId: storeId || undefined,
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
				<div className="flex justify-end gap-2 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="h-10 rounded-full border border-(--line) px-4 text-sm font-semibold text-(--sea-ink-soft) transition hover:bg-(--line)"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={updateStockEntry.isPending}
						className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						Save Changes
					</button>
				</div>
			</form>
		</Modal>
	);
}
