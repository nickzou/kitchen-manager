import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Combobox } from "#/components/Combobox";
import { DatePicker } from "#/components/DatePicker";
import { NumberInput } from "#/components/NumberInput";
import { Page } from "#/components/Page";
import { authClient } from "#/lib/auth-client";
import { useCategories } from "#/lib/hooks/use-categories";
import { useProducts } from "#/lib/hooks/use-products";
import { useQuantityUnits } from "#/lib/hooks/use-quantity-units";
import {
	type StockEntry,
	useConsumeStock,
	useCreateStockEntry,
	useStockEntries,
} from "#/lib/hooks/use-stock-entries";
import { useStockLogs } from "#/lib/hooks/use-stock-logs";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/stock/")({ component: StockPage });

function StockPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const { data: products } = useProducts();
	const { data: categories } = useCategories();
	const { data: quantityUnits } = useQuantityUnits();
	const { data: stockEntries, isLoading: entriesLoading } = useStockEntries();
	const { data: stockLogs } = useStockLogs();
	const createStockEntry = useCreateStockEntry();
	const consumeStock = useConsumeStock();

	const [productId, setProductId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [expirationDate, setExpirationDate] = useState("");
	const [price, setPrice] = useState("");
	const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
	const [consumeAmounts, setConsumeAmounts] = useState<Record<string, string>>(
		{},
	);

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	async function handleAddStock(e: React.FormEvent) {
		e.preventDefault();
		if (!productId || !quantity) return;
		await createStockEntry.mutateAsync({
			productId,
			quantity,
			expirationDate: expirationDate || undefined,
			price: price || undefined,
		});
		setQuantity("");
		setExpirationDate("");
		setPrice("");
	}

	async function handleConsume(stockEntryId: string) {
		const amount = consumeAmounts[stockEntryId] ?? "1";
		if (!amount) return;
		await consumeStock.mutateAsync({ stockEntryId, quantity: amount });
		setConsumeAmounts((prev) => ({ ...prev, [stockEntryId]: "" }));
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
		<Page as="main" className="px-4 pb-8 pt-14">
			<section className="island-shell rise-in rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Inventory</p>
				<h1 className="display-title mb-6 text-3xl font-bold text-(--sea-ink)">
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
					<button
						type="submit"
						disabled={createStockEntry.isPending}
						className="flex h-10 items-center gap-1.5 rounded-full bg-(--lagoon-deep) px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
					>
						<Plus size={16} />
						Add Stock
					</button>
				</form>

				{/* Product stock list */}
				{entriesLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading…</p>
				) : !productStockList.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						No products yet. Add stock above!
					</p>
				) : (
					<div className="mb-8 flex flex-col gap-1">
						{productStockList.map(({ product, entries, totalStock }) => {
							const unit = getUnitAbbr(product.quantityUnitId);
							const isLow =
								Number.parseFloat(product.minStockAmount) > 0 &&
								totalStock < Number.parseFloat(product.minStockAmount);
							const isExpanded = expandedProduct === product.id;
							const categoryName = getCategoryName(product.categoryId);

							return (
								<div key={product.id}>
									<button
										type="button"
										onClick={() =>
											setExpandedProduct(isExpanded ? null : product.id)
										}
										className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-(--surface)"
									>
										{isExpanded ? (
											<ChevronDown
												size={16}
												className="text-(--sea-ink-soft)"
											/>
										) : (
											<ChevronRight
												size={16}
												className="text-(--sea-ink-soft)"
											/>
										)}
										<span className="flex-1 text-sm font-medium text-(--sea-ink)">
											{product.name}
											{categoryName && (
												<span className="ml-2 rounded-full bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-medium text-(--lagoon-deep)">
													{categoryName}
												</span>
											)}
										</span>
										<span
											className={cn(
												"text-sm font-semibold",
												isLow
													? "text-red-600 dark:text-red-400"
													: "text-(--sea-ink)",
											)}
										>
											{totalStock}
											{unit ? ` ${unit}` : ""}
											{isLow && " ⚠"}
										</span>
									</button>

									{isExpanded && entries.length > 0 && (
										<div className="ml-8 mb-2 flex flex-col gap-1">
											{entries.map((entry) => (
												<div
													key={entry.id}
													className="flex flex-wrap items-center gap-3 rounded-lg bg-(--surface) px-3 py-2 text-xs text-(--sea-ink-soft)"
												>
													<span className="font-medium text-(--sea-ink)">
														{entry.quantity}
														{unit ? ` ${unit}` : ""}
													</span>
													{entry.expirationDate && (
														<span>
															Exp:{" "}
															{new Date(
																entry.expirationDate,
															).toLocaleDateString()}
														</span>
													)}
													{entry.purchaseDate && (
														<span>
															Purchased:{" "}
															{new Date(
																entry.purchaseDate,
															).toLocaleDateString()}
														</span>
													)}
													{entry.price && <span>${entry.price}</span>}
													<div className="ml-auto flex items-center gap-1.5">
														<NumberInput
															placeholder="Qty"
															step="any"
															min="0.01"
															max={entry.quantity}
															value={consumeAmounts[entry.id] ?? "1"}
															onChange={(e) =>
																setConsumeAmounts((prev) => ({
																	...prev,
																	[entry.id]: e.target.value,
																}))
															}
															className="h-7 w-20 rounded border bg-white px-2 text-xs dark:bg-(--surface)"
														/>
														<button
															type="button"
															onClick={() => handleConsume(entry.id)}
															disabled={
																consumeStock.isPending ||
																!(consumeAmounts[entry.id] ?? "1")
															}
															className="flex h-7 items-center gap-1 rounded-full bg-amber-600 px-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
														>
															<Minus size={12} />
															Use
														</button>
													</div>
												</div>
											))}
											{entries.length === 0 && (
												<p className="px-3 py-2 text-xs text-(--sea-ink-soft)">
													No stock entries
												</p>
											)}
										</div>
									)}

									{isExpanded && entries.length === 0 && (
										<p className="ml-8 mb-2 px-3 py-2 text-xs text-(--sea-ink-soft)">
											No stock entries
										</p>
									)}
								</div>
							);
						})}
					</div>
				)}

				{/* Recent activity */}
				{recentLogs.length > 0 && (
					<div className="border-t border-(--line) pt-6">
						<h2 className="mb-4 text-lg font-bold text-(--sea-ink)">
							Recent Activity
						</h2>
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
					</div>
				)}
			</section>
		</Page>
	);
}
