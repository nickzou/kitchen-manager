import { CookingPot, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "#src/components/Button";
import { Modal } from "#src/components/Modal";
import { NumberInput } from "#src/components/NumberInput";
import type { ProductUnitConversion } from "#src/lib/hooks/use-product-unit-conversions";
import type { Product } from "#src/lib/hooks/use-products";
import type { QuantityUnit } from "#src/lib/hooks/use-quantity-units";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import {
	buildConversionGraph,
	tryConvert,
} from "#src/lib/recipe-utils/conversion-graph";

export type IngredientOverrideMap = Record<
	string,
	{ quantity: string; quantityUnitId: string | null }
>;

interface CookSubmitInput {
	ingredientOverrides: IngredientOverrideMap;
	skippedIngredients: string[];
	groupSelections: Record<string, string>;
}

interface CookAdjustModalProps {
	open: boolean;
	recipeName: string;
	ingredients: RecipeIngredient[];
	products: Product[];
	quantityUnits: QuantityUnit[];
	unitConversions: UnitConversion[];
	productConversions: ProductUnitConversion[];
	scaleFactor: number;
	isCooking: boolean;
	onCancel: () => void;
	onCook: (input: CookSubmitInput) => void;
	onCookAsIs: (input: { groupSelections: Record<string, string> }) => void;
}

interface RowState {
	quantity: string;
	unitId: string | null;
}

function roundDisplay(value: number): string {
	if (!Number.isFinite(value)) return "";
	if (value === 0) return "0";
	const rounded = value < 10 ? value.toFixed(2) : value.toFixed(1);
	return rounded.replace(/\.?0+$/, "");
}

export function CookAdjustModal({
	open,
	recipeName,
	ingredients,
	products,
	quantityUnits,
	unitConversions,
	productConversions,
	scaleFactor,
	isCooking,
	onCancel,
	onCook,
	onCookAsIs,
}: CookAdjustModalProps) {
	const groups = useMemo(() => {
		const map = new Map<string, RecipeIngredient[]>();
		for (const ing of ingredients) {
			if (!ing.groupName) continue;
			const list = map.get(ing.groupName) ?? [];
			list.push(ing);
			map.set(ing.groupName, list);
		}
		return map;
	}, [ingredients]);

	const ungrouped = useMemo(
		() => ingredients.filter((i) => !i.groupName),
		[ingredients],
	);

	const initialRows = useMemo(() => {
		const out: Record<string, RowState> = {};
		for (const ing of ingredients) {
			out[ing.id] = {
				quantity: roundDisplay(Number(ing.quantity) * scaleFactor),
				unitId: ing.quantityUnitId,
			};
		}
		return out;
	}, [ingredients, scaleFactor]);

	const initialGroupSelections = useMemo(() => {
		const out: Record<string, string> = {};
		for (const [name, ings] of groups) {
			out[name] = ings[0].id;
		}
		return out;
	}, [groups]);

	const [rows, setRows] = useState<Record<string, RowState>>(initialRows);
	const [skipped, setSkipped] = useState<Set<string>>(new Set());
	const [groupSelections, setGroupSelections] = useState<
		Record<string, string>
	>(initialGroupSelections);

	useEffect(() => {
		if (open) {
			setRows(initialRows);
			setSkipped(new Set());
			setGroupSelections(initialGroupSelections);
		}
	}, [open, initialRows, initialGroupSelections]);

	function getProductName(productId: string | null): string {
		if (!productId) return "Unknown product";
		return products.find((p) => p.id === productId)?.name ?? "Unknown product";
	}

	function getUnitLabel(unitId: string | null): string {
		if (!unitId) return "";
		const u = quantityUnits.find((q) => q.id === unitId);
		return u?.abbreviation ?? u?.name ?? "";
	}

	function getUnitOptionsForIngredient(ing: RecipeIngredient): QuantityUnit[] {
		// Build a graph that combines this product's per-product conversions
		// with the global conversions. Any unit reachable from the ingredient's
		// current unit is offerable, since we can round-trip through the graph.
		const product = products.find((p) => p.id === ing.productId);
		const relevant = [
			...productConversions.filter((c) => c.productId === ing.productId),
			...unitConversions,
		];
		const graph = buildConversionGraph(relevant);
		const startUnit = ing.quantityUnitId ?? product?.defaultQuantityUnitId;
		const out = new Set<string>();
		if (startUnit) out.add(startUnit);
		if (product?.defaultQuantityUnitId) out.add(product.defaultQuantityUnitId);
		if (startUnit) {
			for (const u of quantityUnits) {
				if (out.has(u.id)) continue;
				if (tryConvert(graph, 1, startUnit, u.id) !== null) {
					out.add(u.id);
				}
			}
		}
		return quantityUnits.filter((u) => out.has(u.id));
	}

	function handleQuantityChange(ingId: string, value: string) {
		setRows((prev) => ({
			...prev,
			[ingId]: { ...prev[ingId], quantity: value },
		}));
	}

	function handleUnitChange(ing: RecipeIngredient, newUnitId: string) {
		setRows((prev) => {
			const row = prev[ing.id];
			const relevant = [
				...productConversions.filter((c) => c.productId === ing.productId),
				...unitConversions,
			];
			const graph = buildConversionGraph(relevant);
			const currentQty = Number(row.quantity);
			let nextQty = row.quantity;
			if (
				Number.isFinite(currentQty) &&
				row.unitId &&
				row.unitId !== newUnitId
			) {
				const converted = tryConvert(graph, currentQty, row.unitId, newUnitId);
				if (converted !== null) {
					nextQty = roundDisplay(converted);
				}
			}
			return {
				...prev,
				[ing.id]: { quantity: nextQty, unitId: newUnitId },
			};
		});
	}

	function resetRow(ing: RecipeIngredient) {
		setRows((prev) => ({
			...prev,
			[ing.id]: {
				quantity: roundDisplay(Number(ing.quantity) * scaleFactor),
				unitId: ing.quantityUnitId,
			},
		}));
	}

	function isRowChanged(ing: RecipeIngredient): boolean {
		const row = rows[ing.id];
		if (!row) return false;
		const base = roundDisplay(Number(ing.quantity) * scaleFactor);
		return row.quantity !== base || row.unitId !== ing.quantityUnitId;
	}

	function toggleSkip(ingId: string) {
		setSkipped((prev) => {
			const next = new Set(prev);
			if (next.has(ingId)) {
				next.delete(ingId);
			} else {
				next.add(ingId);
			}
			return next;
		});
	}

	function buildOverrides(): IngredientOverrideMap {
		const out: IngredientOverrideMap = {};
		for (const ing of ingredients) {
			if (skipped.has(ing.id)) continue;
			if (!isRowChanged(ing)) continue;
			const row = rows[ing.id];
			const qtyNum = Number(row.quantity);
			if (!Number.isFinite(qtyNum) || qtyNum < 0) continue;

			// Server-side cook math doesn't currently translate between units,
			// so we convert any unit change back into the recipe ingredient's
			// original unit. The server still receives a quantityUnitId for
			// traceability; we always send the recipe's original unit.
			let finalQty = qtyNum;
			if (row.unitId && row.unitId !== ing.quantityUnitId) {
				const relevant = [
					...productConversions.filter((c) => c.productId === ing.productId),
					...unitConversions,
				];
				const graph = buildConversionGraph(relevant);
				const converted = tryConvert(
					graph,
					qtyNum,
					row.unitId,
					ing.quantityUnitId,
				);
				if (converted !== null) finalQty = converted;
			}
			out[ing.id] = {
				quantity: String(finalQty),
				quantityUnitId: ing.quantityUnitId,
			};
		}
		return out;
	}

	function handleCook() {
		onCook({
			ingredientOverrides: buildOverrides(),
			skippedIngredients: Array.from(skipped),
			groupSelections,
		});
	}

	function handleCookAsIs() {
		onCookAsIs({ groupSelections });
	}

	function renderRow(ing: RecipeIngredient, withinGroup?: string) {
		const row = rows[ing.id];
		if (!row) return null;
		const isSkipped = skipped.has(ing.id);
		const unitOptions = getUnitOptionsForIngredient(ing);
		const baseLabel = getUnitLabel(ing.quantityUnitId);
		const baseQty = roundDisplay(Number(ing.quantity) * scaleFactor);
		const showSkipToggle = ing.optional && !withinGroup;
		const showGroupRadio = !!withinGroup;
		const isSelectedInGroup =
			withinGroup && groupSelections[withinGroup] === ing.id;
		const disabled = isSkipped || (showGroupRadio && !isSelectedInGroup);

		return (
			<div
				key={ing.id}
				className={`rounded-lg border border-(--line) px-3 py-2 ${disabled ? "opacity-60" : ""}`}
			>
				<div className="flex flex-wrap items-center gap-2">
					{showGroupRadio && (
						<input
							type="radio"
							name={`group-${withinGroup}`}
							checked={!!isSelectedInGroup}
							onChange={() =>
								setGroupSelections({
									...groupSelections,
									[withinGroup]: ing.id,
								})
							}
							className="accent-(--lagoon)"
						/>
					)}
					<span className="flex-1 text-sm font-medium text-(--sea-ink)">
						{getProductName(ing.productId)}
						{ing.optional && (
							<span className="ml-1.5 text-xs font-normal text-amber-700 dark:text-amber-300">
								(optional)
							</span>
						)}
					</span>
					<NumberInput
						step="any"
						min="0"
						value={row.quantity}
						onChange={(e) => handleQuantityChange(ing.id, e.target.value)}
						disabled={disabled}
						className="w-20"
						aria-label={`Quantity for ${getProductName(ing.productId)}`}
					/>
					{unitOptions.length > 1 ? (
						<select
							value={row.unitId ?? ""}
							onChange={(e) => handleUnitChange(ing, e.target.value)}
							disabled={disabled}
							aria-label={`Unit for ${getProductName(ing.productId)}`}
							className="h-9 rounded-lg border border-(--line) bg-(--surface) px-2 text-sm text-(--sea-ink)"
						>
							{unitOptions.map((u) => (
								<option key={u.id} value={u.id}>
									{u.abbreviation ?? u.name}
								</option>
							))}
						</select>
					) : (
						<span className="text-sm text-(--sea-ink-soft)">{baseLabel}</span>
					)}
				</div>
				<div className="mt-1 flex items-center gap-3 text-xs text-(--sea-ink-soft)">
					<span>
						recipe: {baseQty}
						{baseLabel ? ` ${baseLabel}` : ""}
					</span>
					{isRowChanged(ing) && !disabled && (
						<button
							type="button"
							onClick={() => resetRow(ing)}
							className="inline-flex items-center gap-1 text-(--lagoon-deep) hover:underline"
						>
							<RotateCcw size={11} />
							original
						</button>
					)}
					{showSkipToggle && (
						<label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 select-none">
							<input
								type="checkbox"
								checked={!isSkipped}
								onChange={() => toggleSkip(ing.id)}
								className="accent-(--lagoon)"
							/>
							Use this time
						</label>
					)}
				</div>
			</div>
		);
	}

	return (
		<Modal
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel();
			}}
			title={`Cook ${recipeName}`}
		>
			<p className="mb-3 text-xs text-(--sea-ink-soft)">
				Adjust amounts to match what you actually used. Stock will be deducted
				based on these values.
			</p>
			<div className="max-h-[55vh] overflow-y-auto pr-1">
				<div className="flex flex-col gap-2">
					{ungrouped.map((ing) => renderRow(ing))}
				</div>
				{[...groups].map(([name, groupIngs]) => (
					<div key={name} className="mt-3">
						<p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-(--sea-ink-soft)">
							{name}
						</p>
						<div className="flex flex-col gap-2">
							{groupIngs.map((ing) => renderRow(ing, name))}
						</div>
					</div>
				))}
			</div>
			<div className="mt-4 flex flex-wrap items-center gap-2">
				<Button
					type="button"
					onClick={handleCook}
					disabled={isCooking}
					size="sm"
					className="flex items-center gap-1.5 px-4"
				>
					<CookingPot size={14} />
					{isCooking ? "Cooking…" : "Cook"}
				</Button>
				<button
					type="button"
					onClick={handleCookAsIs}
					disabled={isCooking}
					className="flex h-8 items-center rounded-full border border-(--line) px-3 text-sm font-medium text-(--sea-ink) transition hover:bg-(--surface) disabled:opacity-50"
				>
					Cook as-is
				</button>
				<button
					type="button"
					onClick={onCancel}
					disabled={isCooking}
					className="flex h-8 items-center rounded-full px-3 text-sm font-medium text-(--sea-ink-soft) transition hover:bg-(--surface)"
				>
					Cancel
				</button>
			</div>
		</Modal>
	);
}
