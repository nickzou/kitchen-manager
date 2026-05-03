import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateRangePicker } from "#src/components/DateRangePicker";
import { Island } from "#src/components/Island";
import { Page } from "#src/components/Page";
import { authClient } from "#src/lib/auth-client";
import {
	type IngredientRecipeRef,
	useIngredientSummary,
} from "#src/lib/hooks/use-ingredient-summary";
import { cn } from "#src/lib/utils";

export const Route = createFileRoute("/meal-plan/shopping-list")({
	component: ShoppingListPage,
});

function getMonday(d: Date): Date {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	date.setDate(diff);
	date.setHours(0, 0, 0, 0);
	return date;
}

function toDateString(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function checkedStorageKey(startDate: string, endDate: string) {
	return `shopping-list-checked:${startDate}:${endDate}`;
}

function useCheckedItems(startDate: string, endDate: string) {
	const storageKey = checkedStorageKey(startDate, endDate);
	const [checked, setChecked] = useState<Set<string>>(() => new Set());

	// Hydrate from localStorage when the storage key changes (e.g. date range
	// switches). SSR-safe: skip on server.
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

function ShoppingListPage() {
	const { data: session, isPending: sessionLoading } = authClient.useSession();
	const navigate = useNavigate();

	const [startDate, setStartDate] = useState(() =>
		toDateString(getMonday(new Date())),
	);
	const [endDate, setEndDate] = useState(() => {
		const end = getMonday(new Date());
		end.setDate(end.getDate() + 6);
		return toDateString(end);
	});

	const { data: summary, isLoading } = useIngredientSummary(startDate, endDate);
	const { checked, toggle, reset } = useCheckedItems(startDate, endDate);
	const [expanded, setExpanded] = useState<Set<string>>(new Set());

	function toggleExpanded(key: string) {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	if (sessionLoading) return null;
	if (!session) {
		navigate({ to: "/sign-in" });
		return null;
	}

	const deficit =
		summary?.ingredients.filter((i) => i.status === "deficit") ?? [];
	const sufficient =
		summary?.ingredients.filter((i) => i.status === "sufficient") ?? [];
	const unknownUnit =
		summary?.ingredients.filter((i) => i.status === "unknown_unit") ?? [];
	const restock = summary?.restock ?? [];

	const totalRows =
		(summary?.ingredients.length ?? 0) +
		restock.length +
		(summary?.unlinkedIngredients.length ?? 0);
	const checkedCount = checked.size;

	const statusBadge: Record<string, string> = {
		deficit: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		sufficient:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		unknown_unit:
			"bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
		restock:
			"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
	};

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

				{/* Date range picker */}
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
				) : !summary?.ingredients.length &&
					!summary?.unlinkedIngredients.length &&
					!summary?.restock.length ? (
					<p className="text-sm text-(--sea-ink-soft)">
						Nothing to buy — no planned meals and all tracked staples are at
						min.
					</p>
				) : (
					<div className="flex flex-col gap-6">
						{/* Progress + reset */}
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

						{/* Deficit / Missing */}
						{deficit.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">
									Missing ({deficit.length})
								</h2>
								<div className="flex flex-col gap-1">
									{deficit.map((item) => {
										const key = `${item.productId}-${item.quantityUnitId}`;
										return (
											<IngredientRow
												key={key}
												item={item}
												badgeClass={statusBadge.deficit}
												checked={checked.has(key)}
												onToggle={() => toggle(key)}
												expanded={expanded.has(key)}
												onToggleExpand={() => toggleExpanded(key)}
											/>
										);
									})}
								</div>
							</div>
						)}

						{/* Restock: tracked staples below their min stock */}
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
											/>
										);
									})}
								</div>
							</div>
						)}

						{/* Sufficient / In Stock */}
						{sufficient.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-green-600 dark:text-green-400">
									In Stock ({sufficient.length})
								</h2>
								<div className="flex flex-col gap-1">
									{sufficient.map((item) => {
										const key = `${item.productId}-${item.quantityUnitId}`;
										return (
											<IngredientRow
												key={key}
												item={item}
												badgeClass={statusBadge.sufficient}
												checked={checked.has(key)}
												onToggle={() => toggle(key)}
												expanded={expanded.has(key)}
												onToggleExpand={() => toggleExpanded(key)}
											/>
										);
									})}
								</div>
							</div>
						)}

						{/* Unknown units */}
						{unknownUnit.length > 0 && (
							<div>
								<h2 className="mb-3 text-sm font-semibold text-gray-500">
									Unknown Units ({unknownUnit.length})
								</h2>
								<div className="flex flex-col gap-1">
									{unknownUnit.map((item) => {
										const key = `${item.productId}-${item.quantityUnitId}`;
										return (
											<IngredientRow
												key={key}
												item={item}
												badgeClass={statusBadge.unknown_unit}
												checked={checked.has(key)}
												onToggle={() => toggle(key)}
												expanded={expanded.has(key)}
												onToggleExpand={() => toggleExpanded(key)}
											/>
										);
									})}
								</div>
							</div>
						)}

						{/* Unlinked ingredients */}
						{summary && summary.unlinkedIngredients.length > 0 && (
							<div className="border-t border-(--line) pt-4">
								<h2 className="mb-3 text-sm font-semibold text-(--sea-ink-soft)">
									Unlinked Ingredients
								</h2>
								<div className="flex flex-col gap-1">
									{summary.unlinkedIngredients.map((item) => {
										const key = `unlinked-${item.notes}-${item.quantity}-${item.unitId}`;
										const isChecked = checked.has(key);
										const isExpanded = expanded.has(key);
										return (
											<div key={key}>
												<div className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--sea-ink-soft) transition hover:bg-(--surface)">
													<button
														type="button"
														onClick={() => toggle(key)}
														className={cn(
															"flex flex-1 items-center gap-3 text-left",
															isChecked && "opacity-60",
														)}
													>
														<input
															type="checkbox"
															checked={isChecked}
															onChange={() => toggle(key)}
															onClick={(e) => e.stopPropagation()}
															className="accent-(--lagoon) shrink-0"
														/>
														<span
															className={cn(
																"font-medium text-(--sea-ink)",
																isChecked && "line-through",
															)}
														>
															{item.notes ?? "Unknown ingredient"}
														</span>
														<span className={cn(isChecked && "line-through")}>
															{Number(item.quantity) * item.scaleFactor}
														</span>
													</button>
													<ExpandToggle
														expanded={isExpanded}
														onClick={() => toggleExpanded(key)}
														disabled={item.recipes.length === 0}
													/>
												</div>
												{isExpanded && item.recipes.length > 0 && (
													<RecipeList recipes={item.recipes} unitLabel="" />
												)}
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				)}
			</Island>
		</Page>
	);
}

function RestockRow({
	item,
	badgeClass,
	checked,
	onToggle,
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
}) {
	const unitLabel = item.unitAbbreviation ?? item.unitName ?? "";
	const shortfall = item.minStock - item.stockQuantity;

	return (
		<button
			type="button"
			onClick={onToggle}
			className={cn(
				"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-(--surface)",
				checked && "opacity-60",
			)}
		>
			<input
				type="checkbox"
				checked={checked}
				onChange={onToggle}
				onClick={(e) => e.stopPropagation()}
				className="accent-(--lagoon) shrink-0"
			/>
			<span
				className={cn(
					"flex-1 font-medium text-(--sea-ink)",
					checked && "line-through",
				)}
			>
				{item.productName}
			</span>
			<span className={cn("text-(--sea-ink-soft)", checked && "line-through")}>
				Min: {item.minStock.toFixed(1)}
				{unitLabel ? ` ${unitLabel}` : ""}
			</span>
			<span className={cn("text-(--sea-ink-soft)", checked && "line-through")}>
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
		</button>
	);
}

function IngredientRow({
	item,
	badgeClass,
	checked,
	onToggle,
	expanded,
	onToggleExpand,
}: {
	item: {
		productName: string;
		neededQuantity: number;
		minStockBuffer: number;
		stockQuantity: number;
		unitAbbreviation: string | null;
		unitName: string | null;
		status: string;
		recipes: IngredientRecipeRef[];
	};
	badgeClass: string;
	checked: boolean;
	onToggle: () => void;
	expanded: boolean;
	onToggleExpand: () => void;
}) {
	const unitLabel = item.unitAbbreviation ?? item.unitName ?? "";
	const target = item.neededQuantity + item.minStockBuffer;
	const shortfall = Math.max(0, target - item.stockQuantity);
	const hasBuffer = item.minStockBuffer > 0;
	const hasRecipes = item.recipes.length > 0;

	return (
		<div>
			<div
				className={cn(
					"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-(--surface)",
					checked && "opacity-60",
				)}
			>
				<button
					type="button"
					onClick={onToggle}
					className="flex flex-1 items-center gap-3 text-left"
				>
					<input
						type="checkbox"
						checked={checked}
						onChange={onToggle}
						onClick={(e) => e.stopPropagation()}
						className="accent-(--lagoon) shrink-0"
					/>
					<span
						className={cn(
							"flex-1 font-medium text-(--sea-ink)",
							checked && "line-through",
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
					<span
						className={cn("text-(--sea-ink-soft)", checked && "line-through")}
					>
						Need: {item.neededQuantity.toFixed(1)}
						{unitLabel ? ` ${unitLabel}` : ""}
					</span>
					<span
						className={cn("text-(--sea-ink-soft)", checked && "line-through")}
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
						{item.status === "deficit"
							? `Buy ${shortfall.toFixed(1)}${unitLabel ? ` ${unitLabel}` : ""}`
							: item.status === "sufficient"
								? "OK"
								: "Check units"}
					</span>
				</button>
				<ExpandToggle
					expanded={expanded}
					onClick={onToggleExpand}
					disabled={!hasRecipes}
				/>
			</div>
			{expanded && hasRecipes && (
				<RecipeList recipes={item.recipes} unitLabel={unitLabel} />
			)}
		</div>
	);
}

function ExpandToggle({
	expanded,
	onClick,
	disabled,
}: {
	expanded: boolean;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			disabled={disabled}
			aria-label={
				expanded ? "Hide recipes using this" : "Show recipes using this"
			}
			className="rounded-lg p-1 text-(--sea-ink-soft) transition hover:bg-(--surface) disabled:opacity-30 disabled:hover:bg-transparent"
		>
			{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
	const sorted = [...recipes].sort((a, b) =>
		a.mealPlanEntryDate.localeCompare(b.mealPlanEntryDate),
	);
	return (
		<ul className="ml-9 mt-1 mb-1 flex flex-col gap-0.5 text-xs text-(--sea-ink-soft)">
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
