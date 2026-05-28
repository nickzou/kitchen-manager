import type { ConversionGraph } from "./conversion-graph";
import { tryConvert } from "./conversion-graph";

export interface DerivedCost {
	// Total cost of one production batch.
	total: number;
	// One batch produces `baseAmount` of `baseUnitId`. Pair these with the
	// consumed quantity to compute per-ingredient cost.
	baseAmount: number;
	baseUnitId: string | null;
	// True iff every contributing ingredient was priced AND had a valid unit
	// conversion to its product's default unit.
	complete: boolean;
}

interface DeriveInput {
	recipe: {
		producedQuantity: string | number | null;
		producedQuantityUnitId: string | null;
	};
	ingredients: {
		productId: string;
		quantity: string | number;
		quantityUnitId: string | null;
	}[];
	// Per-product cost-per-default-unit and the product's default unit id.
	products: Map<
		string,
		{
			defaultQuantityUnitId: string | null;
			avgUnitCost: number | null;
		}
	>;
	graphFor: (productId: string) => ConversionGraph;
}

function num(v: string | number | null | undefined): number {
	if (v == null) return 0;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Cost of producing one batch of a recipe (`producedQuantity` of
 * `producedQuantityUnitId`). Per-batch cost = Σ (ingredient cost), where each
 * ingredient cost = qty (converted to its product's default unit) × avgUnitCost.
 *
 * Returns null if the source recipe doesn't have a usable produced quantity.
 */
export function deriveProductCost(input: DeriveInput): DerivedCost | null {
	const producedQty = num(input.recipe.producedQuantity);
	if (!producedQty || !input.recipe.producedQuantityUnitId) return null;

	let total = 0;
	let complete = true;
	let anyPriced = false;

	for (const ing of input.ingredients) {
		const product = input.products.get(ing.productId);
		if (!product || product.avgUnitCost === null) {
			complete = false;
			continue;
		}
		const converted = tryConvert(
			input.graphFor(ing.productId),
			num(ing.quantity),
			ing.quantityUnitId,
			product.defaultQuantityUnitId,
		);
		if (converted === null) {
			complete = false;
			continue;
		}
		total += converted * product.avgUnitCost;
		anyPriced = true;
	}

	if (!anyPriced) return null;

	return {
		total,
		baseAmount: producedQty,
		baseUnitId: input.recipe.producedQuantityUnitId,
		complete,
	};
}
