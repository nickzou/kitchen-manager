import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { buildConversionGraph, tryConvert } from "./conversion-graph";
import { getStockTotals } from "./get-stock-totals";

export function getIngredientAvailability(opts: {
	ingredients: RecipeIngredient[];
	products: Product[];
	stockEntries: StockEntry[];
	unitConversions: UnitConversion[];
	productConversions: {
		productId: string;
		fromUnitId: string;
		toUnitId: string;
		factor: string;
	}[];
	scaleFactor: number;
}): Map<string, "sufficient" | "deficit" | "unknown"> {
	const {
		ingredients,
		products,
		stockEntries,
		unitConversions,
		productConversions,
		scaleFactor,
	} = opts;

	const result = new Map<string, "sufficient" | "deficit" | "unknown">();
	const stockTotals = getStockTotals(stockEntries);

	for (const ing of ingredients) {
		if (!ing.productId) continue;
		const p = products.find((p) => p.id === ing.productId);
		if (!p) continue;

		const specific = productConversions.filter(
			(c) => c.productId === ing.productId,
		);
		const graph = buildConversionGraph([...unitConversions, ...specific]);

		const stockQty = stockTotals.get(ing.productId) ?? 0;
		const needed = Number(ing.quantity) * scaleFactor;
		const neededInStockUnit = tryConvert(
			graph,
			needed,
			ing.quantityUnitId,
			p.defaultQuantityUnitId,
		);

		if (
			ing.quantityUnitId !== p.defaultQuantityUnitId &&
			neededInStockUnit === null
		) {
			result.set(ing.id, "unknown");
		} else {
			const effective = neededInStockUnit ?? needed;
			result.set(ing.id, stockQty >= effective ? "sufficient" : "deficit");
		}
	}

	return result;
}
