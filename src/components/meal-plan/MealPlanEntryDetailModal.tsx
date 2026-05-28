import { Link } from "@tanstack/react-router";
import { CookingPot, Minus, Plus, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "#src/components/Modal";
import { useDerivedCostMap } from "#src/lib/hooks/use-derived-cost";
import { useDerivedNutritionMap } from "#src/lib/hooks/use-derived-nutrition";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import { useProductUnitConversions } from "#src/lib/hooks/use-product-unit-conversions";
import { useProducts } from "#src/lib/hooks/use-products";
import { useRecipeIngredients } from "#src/lib/hooks/use-recipe-ingredients";
import { useStockEntries } from "#src/lib/hooks/use-stock-entries";
import { useUnitConversions } from "#src/lib/hooks/use-unit-conversions";
import { getRecipeCost } from "#src/lib/recipe-utils/get-recipe-cost";
import { getRecipeNutrition } from "#src/lib/recipe-utils/get-recipe-nutrition";

interface MealPlanEntryDetailModalProps {
	entry: MealPlanEntry;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdateServings: (servings: number | null) => void;
	onDelete: () => void;
	onCook: () => void;
	onUncook: () => void;
	isCooking: boolean;
}

function formatCurrency(n: number) {
	return `$${n.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export function MealPlanEntryDetailModal({
	entry,
	open,
	onOpenChange,
	onUpdateServings,
	onDelete,
	onCook,
	onUncook,
	isCooking,
}: MealPlanEntryDetailModalProps) {
	const initialServings = entry.servings ?? entry.recipeServings ?? 1;
	const [localServings, setLocalServings] = useState(initialServings);

	const { data: ingredients } = useRecipeIngredients(entry.recipeId);
	const { data: products } = useProducts();
	const { data: stockEntries } = useStockEntries();
	const { data: unitConversions } = useUnitConversions();
	const ingredientProductIds = useMemo(
		() =>
			Array.from(
				new Set(
					(ingredients ?? [])
						.map((i) => i.productId)
						.filter((id): id is string => !!id),
				),
			),
		[ingredients],
	);
	const { data: allProductConversions } =
		useProductUnitConversions(ingredientProductIds);
	const derivedNutrition = useDerivedNutritionMap();
	const derivedCost = useDerivedCostMap();

	const scaleFactor =
		entry.recipeServings && entry.recipeServings > 0
			? localServings / entry.recipeServings
			: 1;

	const nutrition = useMemo(() => {
		if (!ingredients || !products) return null;
		return getRecipeNutrition({
			ingredients,
			products,
			unitConversions: [
				...(allProductConversions ?? []),
				...(unitConversions ?? []),
			],
			scaleFactor,
			derivedByProduct: derivedNutrition,
		});
	}, [
		ingredients,
		products,
		unitConversions,
		allProductConversions,
		scaleFactor,
		derivedNutrition,
	]);

	const cost = useMemo(() => {
		if (!ingredients || !products || !stockEntries) return null;
		return getRecipeCost({
			ingredients,
			products,
			stockEntries,
			unitConversions: [
				...(allProductConversions ?? []),
				...(unitConversions ?? []),
			],
			scaleFactor,
			derivedByProduct: derivedCost,
		});
	}, [
		ingredients,
		products,
		stockEntries,
		unitConversions,
		allProductConversions,
		scaleFactor,
		derivedCost,
	]);

	function handleServingsChange(delta: number) {
		const next = Math.max(1, localServings + delta);
		setLocalServings(next);
		onUpdateServings(next);
	}

	const costPartial =
		cost &&
		(!cost.complete ||
			(cost.ingredientsTotal > 0 &&
				cost.ingredientsPriced < cost.ingredientsTotal));
	const nutritionPartial = nutrition && !nutrition.complete;

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title={entry.recipeName ?? "Recipe"}
		>
			<div className="mb-4 flex items-center gap-3">
				{entry.recipeImage ? (
					<img
						src={entry.recipeImage}
						alt=""
						className="h-14 w-14 shrink-0 rounded-lg object-cover"
					/>
				) : (
					<div className="h-14 w-14 shrink-0 rounded-lg bg-(--code-bg)" />
				)}
				<div className="min-w-0 flex-1">
					<Link
						to="/recipes/$id"
						params={{ id: entry.recipeId }}
						className="block truncate text-base font-semibold text-(--lagoon-deep) no-underline hover:underline"
					>
						{entry.recipeName ?? "Unknown recipe"}
					</Link>
					{entry.cookedAt && (
						<p className="text-xs font-semibold text-green-700 dark:text-green-300">
							Cooked
						</p>
					)}
				</div>
			</div>

			<div className="mb-4 flex items-center gap-2">
				<span className="text-xs text-(--sea-ink-soft)">Servings:</span>
				<button
					type="button"
					onClick={() => handleServingsChange(-1)}
					className="flex h-7 w-7 items-center justify-center rounded border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
					aria-label="Decrease servings"
				>
					<Minus size={14} />
				</button>
				<span className="min-w-6 text-center text-sm font-semibold text-(--sea-ink)">
					{localServings}
				</span>
				<button
					type="button"
					onClick={() => handleServingsChange(1)}
					className="flex h-7 w-7 items-center justify-center rounded border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
					aria-label="Increase servings"
				>
					<Plus size={14} />
				</button>
			</div>

			<dl className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-(--line) p-3 text-sm">
				<div>
					<dt className="text-xs text-(--sea-ink-soft)">Calories</dt>
					<dd className="font-semibold text-(--sea-ink)">
						{nutrition
							? `${Math.round(nutrition.calories)} cal${nutritionPartial ? "*" : ""}`
							: "—"}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-(--sea-ink-soft)">Cost</dt>
					<dd className="font-semibold text-(--sea-ink)">
						{cost
							? `${formatCurrency(cost.total)}${costPartial ? "*" : ""}`
							: "—"}
					</dd>
				</div>
				<div className="col-span-2">
					<dt className="text-xs text-(--sea-ink-soft)">Macros</dt>
					<dd className="text-(--sea-ink)">
						{nutrition
							? `${nutrition.protein.toFixed(0)}g protein · ${nutrition.fat.toFixed(0)}g fat · ${nutrition.carbs.toFixed(0)}g carbs`
							: "—"}
					</dd>
				</div>
			</dl>
			{(costPartial || nutritionPartial) && (
				<p className="mb-4 text-xs text-amber-600 dark:text-amber-400">
					* Some ingredients are missing data or have a unit-conversion gap —
					total is partial.
				</p>
			)}

			<div className="flex gap-2">
				{entry.cookedAt ? (
					<button
						type="button"
						onClick={onUncook}
						disabled={isCooking}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40"
					>
						<Undo2 size={14} />
						Undo Cook
					</button>
				) : (
					<button
						type="button"
						onClick={onCook}
						disabled={isCooking}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-(--lagoon) px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
					>
						<CookingPot size={14} />
						Cook
					</button>
				)}
				<button
					type="button"
					onClick={onDelete}
					className="flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
					aria-label="Delete entry"
				>
					<Trash2 size={14} />
				</button>
			</div>

			<div className="mt-3 text-center">
				<Link
					to="/recipes/$id"
					params={{ id: entry.recipeId }}
					className="text-xs font-medium text-(--lagoon-deep) hover:underline"
				>
					View recipe →
				</Link>
			</div>
		</Modal>
	);
}
