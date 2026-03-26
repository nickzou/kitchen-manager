import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { buildConversionGraph, tryConvert } from "./conversion-graph";

export interface RecipeNutrition {
	calories: number;
	protein: number;
	fat: number;
	carbs: number;
	ingredientsWithNutrition: number;
	ingredientsTotal: number;
}

export function getRecipeNutrition(opts: {
	ingredients: RecipeIngredient[];
	products: Product[];
	unitConversions: UnitConversion[];
	scaleFactor: number;
}): RecipeNutrition | null {
	const { ingredients, products, unitConversions, scaleFactor } = opts;

	const graph = buildConversionGraph(unitConversions);

	let calories = 0;
	let protein = 0;
	let fat = 0;
	let carbs = 0;
	let ingredientsWithNutrition = 0;
	const ingredientsTotal = ingredients.length;

	for (const ing of ingredients) {
		if (!ing.productId) continue;
		const product = products.find((p) => p.id === ing.productId);
		if (!product) continue;

		// Product must have at least one nutrition field
		if (!product.calories && !product.protein && !product.fat && !product.carbs)
			continue;

		// Convert ingredient quantity to the product's default unit
		const convertedQty = tryConvert(
			graph,
			Number(ing.quantity),
			ing.quantityUnitId,
			product.defaultQuantityUnitId,
		);
		if (convertedQty === null) continue;

		const qty = convertedQty * scaleFactor;
		if (product.calories) calories += Number(product.calories) * qty;
		if (product.protein) protein += Number(product.protein) * qty;
		if (product.fat) fat += Number(product.fat) * qty;
		if (product.carbs) carbs += Number(product.carbs) * qty;
		ingredientsWithNutrition++;
	}

	if (ingredientsWithNutrition === 0) return null;

	return {
		calories,
		protein,
		fat,
		carbs,
		ingredientsWithNutrition,
		ingredientsTotal,
	};
}
