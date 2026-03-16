import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";

export function pickBestEntry(entries: StockEntry[]): StockEntry | null {
	const available = entries.filter((e) => Number.parseFloat(e.quantity) > 0);
	if (available.length === 0) return null;

	return available.sort((a, b) => {
		const aExp = a.expirationDate ? new Date(a.expirationDate).getTime() : null;
		const bExp = b.expirationDate ? new Date(b.expirationDate).getTime() : null;

		// Entries with expiration dates come first
		if (aExp !== null && bExp !== null) return aExp - bExp;
		if (aExp !== null) return -1;
		if (bExp !== null) return 1;

		// Both have no expiration: sort by purchaseDate, then createdAt
		const aPurch = a.purchaseDate
			? new Date(a.purchaseDate).getTime()
			: Number.POSITIVE_INFINITY;
		const bPurch = b.purchaseDate
			? new Date(b.purchaseDate).getTime()
			: Number.POSITIVE_INFINITY;
		if (aPurch !== bPurch) return aPurch - bPurch;

		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	})[0];
}

export function getAvgUnitCost(
	entries: Pick<StockEntry, "price" | "quantity">[],
): number | null {
	const costs = entries
		.filter((e) => e.price && Number.parseFloat(e.quantity) > 0)
		.map(
			(e) =>
				Number.parseFloat(e.price as string) / Number.parseFloat(e.quantity),
		);
	if (costs.length === 0) return null;
	return costs.reduce((sum, c) => sum + c, 0) / costs.length;
}

export function getLatestUnitCost(
	entries: Pick<StockEntry, "price" | "quantity" | "purchaseDate">[],
): number | null {
	const priced = entries.filter(
		(e) => e.price && Number.parseFloat(e.quantity) > 0,
	);
	if (priced.length === 0) return null;
	const latest = [...priced].sort(
		(a, b) =>
			new Date(b.purchaseDate ?? 0).getTime() -
			new Date(a.purchaseDate ?? 0).getTime(),
	)[0];
	return (
		Number.parseFloat(latest.price as string) /
		Number.parseFloat(latest.quantity)
	);
}

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
