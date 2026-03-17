import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { getAvgUnitCost } from "#src/lib/stock-utils";

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

	// Build conversion graph from global unit conversions
	const conversionGraph = new Map<string, Map<string, number>>();
	function addEdge(from: string, to: string, factor: number) {
		if (!conversionGraph.has(from)) conversionGraph.set(from, new Map());
		conversionGraph.get(from)?.set(to, factor);
		if (!conversionGraph.has(to)) conversionGraph.set(to, new Map());
		conversionGraph.get(to)?.set(from, 1 / factor);
	}
	for (const c of unitConversions) {
		addEdge(c.fromUnitId, c.toUnitId, Number(c.factor));
	}

	function tryConvert(
		qty: number,
		fromUnitId: string | null,
		toUnitId: string | null,
	): number | null {
		if (fromUnitId === toUnitId) return qty;
		if (!fromUnitId || !toUnitId) return null;
		const fromEdges = conversionGraph.get(fromUnitId);
		if (!fromEdges) return null;
		const factor = fromEdges.get(toUnitId);
		if (factor !== undefined) return qty * factor;
		return null;
	}

	// Group stock entries by product
	const entriesByProduct = new Map<string, StockEntry[]>();
	for (const entry of stockEntries) {
		const list = entriesByProduct.get(entry.productId) ?? [];
		list.push(entry);
		entriesByProduct.set(entry.productId, list);
	}

	let total = 0;
	let ingredientsPriced = 0;
	const ingredientsTotal = ingredients.length;

	for (const ing of ingredients) {
		if (!ing.productId) continue;
		const product = products.find((p) => p.id === ing.productId);
		if (!product) continue;

		const entries = entriesByProduct.get(ing.productId) ?? [];
		const avgCost = getAvgUnitCost(entries);
		if (avgCost === null) continue;

		// avgCost is per product's default unit; convert ingredient qty to that unit
		const convertedQty = tryConvert(
			Number(ing.quantity),
			ing.quantityUnitId,
			product.defaultQuantityUnitId,
		);
		if (convertedQty === null) continue;

		total += convertedQty * scaleFactor * avgCost;
		ingredientsPriced++;
	}

	if (ingredientsPriced === 0) return null;

	return { total, ingredientsPriced, ingredientsTotal };
}
