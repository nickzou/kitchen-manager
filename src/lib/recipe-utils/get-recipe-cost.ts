import type { ProductUnitConversion } from "#src/lib/hooks/use-product-unit-conversions";
import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { getAvgUnitCost } from "#src/lib/stock-utils";
import { buildConversionGraph, tryConvert } from "./conversion-graph";
import type { DerivedCost } from "./derive-product-cost";

export function getRecipeCost(opts: {
	ingredients: RecipeIngredient[];
	products: Product[];
	stockEntries: StockEntry[];
	unitConversions: UnitConversion[];
	// Per-product unit conversions. Used to build a per-product graph
	// so e.g. Honey's `tsp -> g` and Butter's `tsp -> g` can coexist
	// without overwriting each other in a shared graph.
	productConversions?: ProductUnitConversion[];
	scaleFactor: number;
	// Optional per-product derived cost map for producible products (cost
	// derived from the source recipe's ingredients). Falls back to derived
	// when the product has no priced stock.
	derivedByProduct?: Map<string, DerivedCost>;
}): {
	total: number;
	ingredientsPriced: number;
	ingredientsTotal: number;
	complete: boolean;
} | null {
	const {
		ingredients,
		products,
		stockEntries,
		unitConversions,
		productConversions,
		scaleFactor,
		derivedByProduct,
	} = opts;

	const graphCache = new Map<string, ReturnType<typeof buildConversionGraph>>();
	function graphFor(productId: string) {
		const cached = graphCache.get(productId);
		if (cached) return cached;
		const specific = (productConversions ?? []).filter(
			(c) => c.productId === productId,
		);
		const g = buildConversionGraph([...unitConversions, ...specific]);
		graphCache.set(productId, g);
		return g;
	}

	// Group stock entries by product
	const entriesByProduct = new Map<string, StockEntry[]>();
	for (const entry of stockEntries) {
		const list = entriesByProduct.get(entry.productId) ?? [];
		list.push(entry);
		entriesByProduct.set(entry.productId, list);
	}

	let ingredientsPriced = 0;
	const ingredientsTotal = ingredients.length;
	let complete = true;

	// Ingredient groups represent "OR" alternatives — the cook will use one.
	// Average across the contributors so the recipe cost reflects the
	// typical case rather than summing every alternative as if all were
	// used (mirrors the nutrition rollup).
	const ungrouped: number[] = [];
	const grouped = new Map<string, number[]>();

	for (const ing of ingredients) {
		if (!ing.productId) continue;
		const product = products.find((p) => p.id === ing.productId);
		if (!product) {
			complete = false;
			continue;
		}

		const entries = entriesByProduct.get(ing.productId) ?? [];
		const avgCost = getAvgUnitCost(entries);
		const derived = derivedByProduct?.get(ing.productId);

		let contribution: number | null = null;

		if (avgCost !== null) {
			// avgCost is per product's default unit; convert ingredient qty to that unit
			const convertedQty = tryConvert(
				graphFor(ing.productId),
				Number(ing.quantity),
				ing.quantityUnitId,
				product.defaultQuantityUnitId,
			);
			if (convertedQty === null) {
				complete = false;
			} else {
				contribution = convertedQty * scaleFactor * avgCost;
			}
		} else if (derived && derived.baseAmount > 0) {
			// No own stock to price from — use the source-recipe's per-batch cost.
			const convertedQty = tryConvert(
				graphFor(ing.productId),
				Number(ing.quantity),
				ing.quantityUnitId,
				derived.baseUnitId,
			);
			if (convertedQty === null) {
				complete = false;
			} else {
				contribution =
					(convertedQty * scaleFactor * derived.total) / derived.baseAmount;
				if (!derived.complete) complete = false;
			}
		} else {
			complete = false;
		}

		if (contribution === null) continue;

		if (ing.groupName) {
			const bucket = grouped.get(ing.groupName) ?? [];
			bucket.push(contribution);
			grouped.set(ing.groupName, bucket);
		} else {
			ungrouped.push(contribution);
		}
		ingredientsPriced++;
	}

	if (ingredientsPriced === 0) return null;

	let total = 0;
	for (const c of ungrouped) total += c;
	for (const bucket of grouped.values()) {
		if (bucket.length === 0) continue;
		total += bucket.reduce((s, c) => s + c, 0) / bucket.length;
	}

	return { total, ingredientsPriced, ingredientsTotal, complete };
}
