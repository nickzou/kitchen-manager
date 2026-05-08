import { type ConversionGraph, tryConvert } from "./conversion-graph";

export interface ProductForNutrition {
	defaultQuantityUnitId: string | null;
	nutritionBaseAmount: string | number | null;
	nutritionBaseUnitId: string | null;
	calories: string | number | null;
	protein: string | number | null;
	fat: string | number | null;
	carbs: string | number | null;
}

export interface DerivedNutrition {
	calories: number;
	protein: number;
	fat: number;
	carbs: number;
	baseAmount: number;
	baseUnitId: string | null;
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
	products: Map<string, ProductForNutrition>;
	graphFor: (productId: string) => ConversionGraph;
}

function num(v: string | number | null | undefined): number {
	if (v == null) return 0;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : 0;
}

export function deriveProductNutrition(
	input: DeriveInput,
): DerivedNutrition | null {
	const producedQty = num(input.recipe.producedQuantity);
	if (!producedQty || !input.recipe.producedQuantityUnitId) return null;

	let calories = 0;
	let protein = 0;
	let fat = 0;
	let carbs = 0;
	let complete = true;

	for (const ing of input.ingredients) {
		const product = input.products.get(ing.productId);
		if (!product) {
			complete = false;
			continue;
		}

		const baseUnitId =
			product.nutritionBaseUnitId ?? product.defaultQuantityUnitId;
		const baseAmount = num(product.nutritionBaseAmount) || 1;
		const c = num(product.calories);
		const p = num(product.protein);
		const f = num(product.fat);
		const cb = num(product.carbs);

		// Ingredients with no macro data contribute zero by design — that's
		// not the same as a unit-conversion gap.
		if (c === 0 && p === 0 && f === 0 && cb === 0) continue;

		const ingQty = num(ing.quantity);
		const converted = tryConvert(
			input.graphFor(ing.productId),
			ingQty,
			ing.quantityUnitId,
			baseUnitId,
		);
		if (converted === null) {
			complete = false;
			continue;
		}

		const multiplier = converted / baseAmount;
		calories += c * multiplier;
		protein += p * multiplier;
		fat += f * multiplier;
		carbs += cb * multiplier;
	}

	return {
		calories,
		protein,
		fat,
		carbs,
		baseAmount: producedQty,
		baseUnitId: input.recipe.producedQuantityUnitId,
		complete,
	};
}
