import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Accordion } from "#src/components/Accordion";
import { Button } from "#src/components/Button";
import { Combobox } from "#src/components/Combobox";
import { DateRangePicker } from "#src/components/DateRangePicker";
import { Island } from "#src/components/Island";
import { Modal } from "#src/components/Modal";
import { NumberInput } from "#src/components/NumberInput";
import { Page } from "#src/components/Page";
import { StockEntryForm } from "#src/components/stock/StockEntryForm";
import { useToast } from "#src/components/Toast";
import { getWeekStart } from "#src/lib/format-date";
import { useBrands } from "#src/lib/hooks/use-brands";
import {
	type IngredientRecipeRef,
	type IngredientSummaryItem,
	type UnlinkedIngredient,
	useIngredientSummary,
} from "#src/lib/hooks/use-ingredient-summary";
import { useProductUnitConversions } from "#src/lib/hooks/use-product-unit-conversions";
import { useCreateProduct, useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import {
	type ShoppingListItem,
	useCreateShoppingListItem,
	useDeleteShoppingListItem,
	useShoppingListItems,
} from "#src/lib/hooks/use-shopping-list-items";
import { useStores } from "#src/lib/hooks/use-stores";
import { useUnitConversions } from "#src/lib/hooks/use-unit-conversions";
import { useUserSettings } from "#src/lib/hooks/use-user-settings";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/meal-plan/shopping-list")({
	component: ShoppingListPage,
});

function toDateString(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function checkedStorageKey(startDate: string, endDate: string) {
	return `shopping-list-checked:${startDate}:${endDate}`;
}

function useCheckedItems(startDate: string, endDate: string) {
	const storageKey = checkedStorageKey(startDate, endDate);
	const [checked, setChecked] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const raw = window.localStorage.getItem(storageKey);
			if (!raw) {
				setChecked(new Set());
				return;
			}
			const parsed = JSON.parse(raw) as unknown;
			if (Array.isArray(parsed)) {
				setChecked(
					new Set(parsed.filter((x): x is string => typeof x === "string")),
				);
			} else {
				setChecked(new Set());
			}
		} catch {
			setChecked(new Set());
		}
	}, [storageKey]);

	const toggle = useCallback(
		(key: string) => {
			setChecked((prev) => {
				const next = new Set(prev);
				if (next.has(key)) next.delete(key);
				else next.add(key);
				if (typeof window !== "undefined") {
					window.localStorage.setItem(storageKey, JSON.stringify([...next]));
				}
				return next;
			});
		},
		[storageKey],
	);

	const reset = useCallback(() => {
		setChecked(new Set());
		if (typeof window !== "undefined") {
			window.localStorage.removeItem(storageKey);
		}
	}, [storageKey]);

	return { checked, toggle, reset };
}

type IngredientItem = IngredientSummaryItem & { key: string };
type UnlinkedItem = UnlinkedIngredient & { key: string };

function ShoppingListPage() {
	const { data: settings } = useUserSettings();
	const weekStartDay = settings?.weekStartDay ?? 1;

	const [startDate, setStartDate] = useState(() =>
		toDateString(getWeekStart(new Date(), 1)),
	);
	const [endDate, setEndDate] = useState(() => {
		const end = getWeekStart(new Date(), 1);
		end.setDate(end.getDate() + 6);
		return toDateString(end);
	});

	// When user settings load, reset the default range to honor weekStartDay.
	// Stops re-applying once the user has changed the range manually so we
	// don't clobber their selection.
	const settingsAppliedRef = useRef(false);
	useEffect(() => {
		if (!settings || settingsAppliedRef.current) return;
		settingsAppliedRef.current = true;
		const start = getWeekStart(new Date(), weekStartDay);
		const end = getWeekStart(new Date(), weekStartDay);
		end.setDate(end.getDate() + 6);
		setStartDate(toDateString(start));
		setEndDate(toDateString(end));
	}, [settings, weekStartDay]);

	const { data: summary, isLoading } = useIngredientSummary(startDate, endDate);
	const { checked, toggle, reset } = useCheckedItems(startDate, endDate);

	// Data for the StockEntryForm modal that opens when the user adds an
	// item directly from the shopping list. Cached by React Query so this
	// is cheap on visits where the user never opens the modal.
	const { data: products } = useProducts();
	const { data: stores } = useStores();
	const { data: brands } = useBrands();
	const { data: quantityUnits } = useQuantityUnits();
	const { data: globalConversions } = useUnitConversions();
	const summaryProductIds = useMemo(
		() => [
			...new Set([
				...(summary?.ingredients ?? []).map((i) => i.productId),
				...(summary?.restock ?? []).map((r) => r.productId),
			]),
		],
		[summary],
	);
	const { data: productConversions } =
		useProductUnitConversions(summaryProductIds);

	const toast = useToast();
	const [stockingFor, setStockingFor] = useState<{
		productId: string;
		quantity: string;
		unitId?: string;
		productName: string;
	} | null>(null);

	const [addItemOpen, setAddItemOpen] = useState(false);
	const [addItemProductId, setAddItemProductId] = useState("");
	const [addItemQuantity, setAddItemQuantity] = useState("1");
	const [addItemUnitId, setAddItemUnitId] = useState("");
	const createShoppingListItem = useCreateShoppingListItem();
	const deleteShoppingListItem = useDeleteShoppingListItem();
	const createProduct = useCreateProduct();

	const productMap = useMemo(
		() => new Map((products ?? []).map((p) => [p.id, p])),
		[products],
	);
	const unitMap = useMemo(
		() => new Map((quantityUnits ?? []).map((u) => [u.id, u])),
		[quantityUnits],
	);

	function resetAddItemForm() {
		setAddItemProductId("");
		setAddItemQuantity("1");
		setAddItemUnitId("");
	}

	async function handleSubmitAddItem(e: FormEvent) {
		e.preventDefault();
		if (!addItemProductId || !addItemQuantity) return;
		await createShoppingListItem.mutateAsync({
			productId: addItemProductId,
			quantity: addItemQuantity,
			quantityUnitId: addItemUnitId || null,
		});
		resetAddItemForm();
		setAddItemOpen(false);
	}
	function withKey(item: IngredientSummaryItem): IngredientItem {
		return { ...item, key: `${item.productId}-${item.quantityUnitId}` };
	}

	const deficit =
		summary?.ingredients.filter((i) => i.status === "deficit").map(withKey) ??
		[];
	const unknownUnit =
		summary?.ingredients
			.filter((i) => i.status === "unknown_unit")
			.map(withKey) ?? [];
	const restock = summary?.restock ?? [];
	const unlinked: UnlinkedItem[] =
		summary?.unlinkedIngredients.map((item) => ({
			...item,
			key: `unlinked-${item.notes}-${item.quantity}-${item.unitId}`,
		})) ?? [];

	const { data: manualItems } = useShoppingListItems();
	const manual = manualItems ?? [];

	const totalRows =
		deficit.length +
		unknownUnit.length +
		restock.length +
		unlinked.length +
		manual.length;
	const checkedCount = checked.size;

	const statusBadge: Record<string, string> = {
		deficit: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		unknown_unit:
			"bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
		restock:
			"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
	};

	function ingredientTrigger(item: IngredientItem) {
		const unitLabel = item.unitAbbreviation ?? item.unitName ?? "";
		const target = item.neededQuantity + item.minStockBuffer;
		const shortfall = Math.max(0, target - item.stockQuantity);
		const hasBuffer = item.minStockBuffer > 0;
		const isChecked = checked.has(item.key);

		return (
			<div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
				<span
					className={cn(
						"flex-1 font-medium text-(--sea-ink)",
						isChecked && "line-through",
					)}
				>
					{item.productName}
					{hasBuffer && item.status === "deficit" && (
						<span className="ml-2 text-xs text-(--sea-ink-soft)">
							(keeps {item.minStockBuffer.toFixed(1)}
							{unitLabel ? ` ${unitLabel}` : ""} min)
						</span>
					)}
				</span>
				<div className="flex items-center gap-3">
					<span
						className={cn(
							"text-xs sm:text-sm text-(--sea-ink-soft)",
							isChecked && "line-through",
						)}
					>
						Need: {item.neededQuantity.toFixed(1)}
						{unitLabel ? ` ${unitLabel}` : ""}
					</span>
					<span
						className={cn(
							"text-xs sm:text-sm text-(--sea-ink-soft)",
							isChecked && "line-through",
						)}
					>
						Have: {item.stockQuantity.toFixed(1)}
						{unitLabel ? ` ${unitLabel}` : ""}
					</span>
					<span
						className={cn(
							"rounded-full px-2 py-0.5 text-xs font-semibold",
							statusBadge[item.status],
						)}
					>
						{item.status === "deficit"
							? `Buy ${shortfall.toFixed(1)}${unitLabel ? ` ${unitLabel}` : ""}`
							: item.status === "sufficient"
								? "OK"
								: "Check units"}
					</span>
				</div>
			</div>
		);
	}

	function ingredientBuyQuantity(item: IngredientItem) {
		const target = item.neededQuantity + item.minStockBuffer;
		const shortfall = Math.max(0, target - item.stockQuantity);
		return shortfall > 0
			? shortfall.toFixed(2).replace(/\.?0+$/, "")
			: item.neededQuantity.toFixed(2).replace(/\.?0+$/, "");
	}

	function ingredientAction(item: IngredientItem) {
		return (
			<div className="flex items-center gap-1">
				<StockButton
					onClick={() =>
						setStockingFor({
							productId: item.productId,
							productName: item.productName,
							quantity: ingredientBuyQuantity(item),
							unitId: item.quantityUnitId ?? undefined,
						})
					}
				/>
				<RowCheckbox
					checked={checked.has(item.key)}
					onChange={() => toggle(item.key)}
				/>
			</div>
		);
	}

	function ingredientContent(item: IngredientItem) {
		const unitLabel = item.unitAbbreviation ?? item.unitName ?? "";
		return <RecipeList recipes={item.recipes} unitLabel={unitLabel} />;
	}

	return (
		<Page as="main" className="pb-8 pt-14">
			<Island as="section" className="animate-rise-in rounded-2xl p-6 sm:p-8">
				<p className="mb-2 text-[0.69rem] font-bold uppercase tracking-[0.16em] text-(--kicker)">
					Planning
				</p>
				<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
					<h1 className="font-display text-3xl font-bold text-(--sea-ink)">
						Shopping List
					</h1>
					<Link
						to="/meal-plan"
						className="rounded-lg border border-(--line) px-3 py-1.5 text-xs font-semibold text-(--sea-ink-soft) no-underline transition hover:bg-(--surface)"
					>
						Calendar
					</Link>
				</div>

				<div className="mb-6 border-b border-(--line) pb-6">
					<DateRangePicker
						startDate={startDate}
						endDate={endDate}
						onChange={(start, end) => {
							setStartDate(start);
							setEndDate(end);
						}}
					/>
				</div>

				{isLoading ? (
					<p className="text-sm text-(--sea-ink-soft)">Loading...</p>
				) : totalRows === 0 ? (
					<p className="text-sm text-(--sea-ink-soft)">
						Nothing to buy — every planned ingredient is in stock and all
						tracked staples are at min.
					</p>
				) : (
					<div className="flex flex-col gap-6">
						{totalRows > 0 && (
							<div className="flex items-center justify-between text-xs text-(--sea-ink-soft)">
								<span>
									{checkedCount} of {totalRows} crossed off
								</span>
								{checkedCount > 0 && (
									<button
										type="button"
										onClick={reset}
										className="rounded-lg border border-(--line) px-2 py-1 font-semibold transition hover:bg-(--surface)"
									>
										Reset
									</button>
								)}
							</div>
						)}

						{deficit.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">
									Missing ({deficit.length})
								</h2>
								<Accordion
									type="multi"
									items={deficit}
									renderTrigger={ingredientTrigger}
									renderAction={ingredientAction}
									renderContent={ingredientContent}
								/>
							</div>
						)}

						{restock.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-amber-600 dark:text-amber-400">
									Restock ({restock.length})
								</h2>
								<div className="flex flex-col gap-1">
									{restock.map((item) => {
										const key = `restock-${item.productId}`;
										return (
											<RestockRow
												key={key}
												item={item}
												badgeClass={statusBadge.restock}
												checked={checked.has(key)}
												onToggle={() => toggle(key)}
												onStock={() =>
													setStockingFor({
														productId: item.productId,
														productName: item.productName,
														quantity: Math.max(
															0,
															item.minStock - item.stockQuantity,
														)
															.toFixed(2)
															.replace(/\.?0+$/, ""),
														unitId: item.quantityUnitId ?? undefined,
													})
												}
											/>
										);
									})}
								</div>
							</div>
						)}

						<div>
							<div className="mb-3 flex items-center justify-between">
								<h2 className="text-sm font-semibold text-(--sea-ink)">
									Added by you{manual.length > 0 ? ` (${manual.length})` : ""}
								</h2>
								<button
									type="button"
									onClick={() => setAddItemOpen(true)}
									className="flex items-center gap-1 rounded-lg border border-(--line) px-2 py-1 text-xs font-semibold text-(--sea-ink-soft) transition hover:bg-(--surface)"
								>
									<Plus size={12} />
									Add item
								</button>
							</div>
							{manual.length > 0 && (
								<div className="flex flex-col gap-1">
									{manual.map((item) => {
										const key = `manual-${item.id}`;
										const product = productMap.get(item.productId);
										const unit = item.quantityUnitId
											? unitMap.get(item.quantityUnitId)
											: product?.defaultQuantityUnitId
												? unitMap.get(product.defaultQuantityUnitId)
												: null;
										const unitLabel = unit?.abbreviation ?? unit?.name ?? "";
										return (
											<ManualItemRow
												key={key}
												item={item}
												productName={product?.name ?? "Unknown product"}
												unitLabel={unitLabel}
												checked={checked.has(key)}
												onToggle={() => toggle(key)}
												onStock={() =>
													setStockingFor({
														productId: item.productId,
														productName: product?.name ?? "Unknown product",
														quantity: item.quantity,
														unitId: item.quantityUnitId ?? undefined,
													})
												}
												onDelete={() => deleteShoppingListItem.mutate(item.id)}
											/>
										);
									})}
								</div>
							)}
						</div>

						{unknownUnit.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-gray-500">
									Unknown Units ({unknownUnit.length})
								</h2>
								<Accordion
									type="multi"
									items={unknownUnit}
									renderTrigger={ingredientTrigger}
									renderAction={ingredientAction}
									renderContent={ingredientContent}
								/>
							</div>
						)}

						{unlinked.length > 0 && (
							<div className="border-t border-(--line) pt-4">
								<h2 className="mb-3 text-sm font-semibold text-(--sea-ink-soft)">
									Unlinked Ingredients
								</h2>
								<Accordion
									type="multi"
									items={unlinked}
									renderTrigger={(item) => {
										const isChecked = checked.has(item.key);
										return (
											<div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
												<span
													className={cn(
														"flex-1 font-medium text-(--sea-ink)",
														isChecked && "line-through",
													)}
												>
													{item.notes ?? "Unknown ingredient"}
												</span>
												<span
													className={cn(
														"text-xs sm:text-sm text-(--sea-ink-soft)",
														isChecked && "line-through",
													)}
												>
													{Number(item.quantity) * item.scaleFactor}
												</span>
											</div>
										);
									}}
									renderAction={(item) => (
										<RowCheckbox
											checked={checked.has(item.key)}
											onChange={() => toggle(item.key)}
										/>
									)}
									renderContent={(item) => (
										<RecipeList recipes={item.recipes} unitLabel="" />
									)}
								/>
							</div>
						)}
					</div>
				)}
			</Island>
			<Modal
				open={stockingFor !== null}
				onOpenChange={(o) => {
					if (!o) setStockingFor(null);
				}}
				title={
					stockingFor ? `Add ${stockingFor.productName} to stock` : "Add stock"
				}
			>
				{stockingFor && (
					<StockEntryForm
						products={products ?? []}
						stores={stores ?? []}
						brands={brands ?? []}
						quantityUnits={quantityUnits ?? []}
						productConversions={(productConversions ?? []).map((c) => ({
							productId: c.productId,
							fromUnitId: c.fromUnitId,
							toUnitId: c.toUnitId,
							factor: c.factor,
						}))}
						globalConversions={(globalConversions ?? []).map((c) => ({
							fromUnitId: c.fromUnitId,
							toUnitId: c.toUnitId,
							factor: c.factor,
						}))}
						initial={{
							productId: stockingFor.productId,
							quantity: stockingFor.quantity,
							unitId: stockingFor.unitId,
						}}
						className="flex flex-col gap-3"
						onSuccess={() => {
							toast.success(`${stockingFor.productName} added to stock`);
							setStockingFor(null);
						}}
					/>
				)}
			</Modal>

			<Modal
				open={addItemOpen}
				onOpenChange={(o) => {
					if (!o) {
						setAddItemOpen(false);
						resetAddItemForm();
					}
				}}
				title="Add item to shopping list"
			>
				<form onSubmit={handleSubmitAddItem} className="flex flex-col gap-3">
					<Combobox
						value={addItemProductId}
						onChange={(v) => {
							setAddItemProductId(v);
							const p = productMap.get(v);
							if (p?.defaultQuantityUnitId) {
								setAddItemUnitId(p.defaultQuantityUnitId);
							}
						}}
						options={(products ?? []).map((p) => ({
							value: p.id,
							label: p.name,
						}))}
						placeholder="Product *"
						required
						className="flex-1"
						onCreateNew={async (name) => {
							const created = await createProduct.mutateAsync({ name });
							setAddItemProductId(created.id);
						}}
					/>
					<div className="flex items-center gap-2">
						<NumberInput
							placeholder="Qty *"
							required
							step="any"
							min="0.01"
							value={addItemQuantity}
							onChange={(e) => setAddItemQuantity(e.target.value)}
							className="w-24"
						/>
						<Combobox
							value={addItemUnitId}
							onChange={setAddItemUnitId}
							options={(quantityUnits ?? []).map((u) => ({
								value: u.id,
								label: u.abbreviation ?? u.name,
							}))}
							placeholder="Unit"
							className="flex-1"
						/>
					</div>
					<Button
						type="submit"
						disabled={
							createShoppingListItem.isPending ||
							!addItemProductId ||
							!addItemQuantity
						}
						className="flex items-center justify-center gap-1.5"
					>
						<Plus size={16} />
						Add to list
					</Button>
				</form>
			</Modal>
		</Page>
	);
}

function ManualItemRow({
	item,
	productName,
	unitLabel,
	checked,
	onToggle,
	onStock,
	onDelete,
}: {
	item: ShoppingListItem;
	productName: string;
	unitLabel: string;
	checked: boolean;
	onToggle: () => void;
	onStock: () => void;
	onDelete: () => void;
}) {
	return (
		<div
			className={cn(
				"flex w-full items-center gap-3 rounded-lg py-2 text-sm transition hover:bg-(--surface)",
				checked && "opacity-60",
			)}
		>
			<button
				type="button"
				onClick={onToggle}
				className="flex min-w-0 flex-1 items-center gap-3 text-left"
			>
				<span
					className={cn(
						"flex-1 font-medium text-(--sea-ink)",
						checked && "line-through",
					)}
				>
					{productName}
				</span>
				<span
					className={cn(
						"text-xs sm:text-sm text-(--sea-ink-soft)",
						checked && "line-through",
					)}
				>
					{Number(item.quantity)
						.toFixed(2)
						.replace(/\.?0+$/, "")}
					{unitLabel ? ` ${unitLabel}` : ""}
				</span>
			</button>
			<StockButton onClick={onStock} />
			<button
				type="button"
				onClick={onDelete}
				title="Remove from list"
				aria-label="Remove from list"
				className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-red-600"
			>
				<X size={16} />
			</button>
			<RowCheckbox checked={checked} onChange={onToggle} />
		</div>
	);
}

function RowCheckbox({
	checked,
	onChange,
}: {
	checked: boolean;
	onChange: () => void;
}) {
	return (
		<input
			type="checkbox"
			checked={checked}
			onChange={onChange}
			aria-label={checked ? "Uncheck item" : "Check item"}
			className="accent-(--lagoon) shrink-0 h-4 w-4 mr-2"
		/>
	);
}

function RestockRow({
	item,
	badgeClass,
	checked,
	onToggle,
	onStock,
}: {
	item: {
		productName: string;
		minStock: number;
		stockQuantity: number;
		unitAbbreviation: string | null;
		unitName: string | null;
	};
	badgeClass: string;
	checked: boolean;
	onToggle: () => void;
	onStock: () => void;
}) {
	const unitLabel = item.unitAbbreviation ?? item.unitName ?? "";
	const shortfall = item.minStock - item.stockQuantity;

	return (
		<div
			className={cn(
				"flex w-full items-center gap-3 rounded-lg py-2 text-sm transition hover:bg-(--surface)",
				checked && "opacity-60",
			)}
		>
			<button
				type="button"
				onClick={onToggle}
				className="flex min-w-0 flex-1 flex-col gap-0.5 text-left sm:flex-row sm:items-center sm:gap-3"
			>
				<span
					className={cn(
						"flex-1 font-medium text-(--sea-ink)",
						checked && "line-through",
					)}
				>
					{item.productName}
				</span>
				<div className="flex items-center gap-3">
					<span
						className={cn(
							"text-xs sm:text-sm text-(--sea-ink-soft)",
							checked && "line-through",
						)}
					>
						Min: {item.minStock.toFixed(1)}
						{unitLabel ? ` ${unitLabel}` : ""}
					</span>
					<span
						className={cn(
							"text-xs sm:text-sm text-(--sea-ink-soft)",
							checked && "line-through",
						)}
					>
						Have: {item.stockQuantity.toFixed(1)}
						{unitLabel ? ` ${unitLabel}` : ""}
					</span>
					<span
						className={cn(
							"rounded-full px-2 py-0.5 text-xs font-semibold",
							badgeClass,
						)}
					>
						Buy {shortfall.toFixed(1)}
						{unitLabel ? ` ${unitLabel}` : ""}
					</span>
				</div>
			</button>
			<StockButton onClick={onStock} />
			<RowCheckbox checked={checked} onChange={onToggle} />
		</div>
	);
}

function StockButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			title="Add to stock"
			aria-label="Add to stock"
			className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-(--surface) hover:text-(--sea-ink)"
		>
			<Plus size={16} />
		</button>
	);
}

function RecipeList({
	recipes,
	unitLabel,
}: {
	recipes: IngredientRecipeRef[];
	unitLabel: string;
}) {
	if (recipes.length === 0) {
		return (
			<p className="text-xs text-(--sea-ink-soft)">No recipes contributed.</p>
		);
	}
	const sorted = [...recipes].sort((a, b) =>
		a.mealPlanEntryDate.localeCompare(b.mealPlanEntryDate),
	);
	return (
		<ul className="flex flex-col gap-0.5 text-xs text-(--sea-ink-soft)">
			{sorted.map((r) => (
				<li
					key={`${r.mealPlanEntryId}-${r.recipeId}`}
					className="flex items-center gap-2"
				>
					<span>•</span>
					<span className="font-medium text-(--sea-ink)">{r.recipeName}</span>
					<span>
						— {r.mealPlanEntryDate} · {r.quantity.toFixed(1)}
						{unitLabel ? ` ${unitLabel}` : ""}
					</span>
				</li>
			))}
		</ul>
	);
}
