import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { getAvgUnitCost } from "#src/lib/stock-utils";
import { buildConversionGraph, tryConvert } from "./conversion-graph";

export function getRecipeCost(opts: {
	ingredients: RecipeIngredient[];
	products: Product[];
	stockEntries: StockEntry[];
	unitConversions: UnitConversion[];
	scaleFactor: number;
}): {
	total: number;
	ingredientsPriced: number;
	ingredientsTotal: number;
} | null {
	const { ingredients, products, stockEntries, unitConversions, scaleFactor } =
		opts;

	const graph = buildConversionGraph(unitConversions);

	// Group stock entries by product
	const entriesByProduct = new Map<string, StockEntry[]>();
	for (const entry of stockEntries) {
		const list = entriesByProduct.get(entry.productId) ?? [];
		list.push(entry);
		entriesByProduct.set(entry.productId, list);
	}

	let ingredientsPriced = 0;
	const ingredientsTotal = ingredients.length;

	// Ingredient groups represent "OR" alternatives — the cook will use one.
	// Average across the contributors so the recipe cost reflects the
	// typical case rather than summing every alternative as if all were
	// used (mirrors the nutrition rollup).
	const ungrouped: number[] = [];
	const grouped = new Map<string, number[]>();

	for (const ing of ingredients) {
		if (!ing.productId) continue;
		const product = products.find((p) => p.id === ing.productId);
		if (!product) continue;

		const entries = entriesByProduct.get(ing.productId) ?? [];
		const avgCost = getAvgUnitCost(entries);
		if (avgCost === null) continue;

		// avgCost is per product's default unit; convert ingredient qty to that unit
		const convertedQty = tryConvert(
			graph,
			Number(ing.quantity),
			ing.quantityUnitId,
			product.defaultQuantityUnitId,
		);
		if (convertedQty === null) continue;

		const contribution = convertedQty * scaleFactor * avgCost;

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

	return { total, ingredientsPriced, ingredientsTotal };
}
