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

		// Nutrition values are recorded "per nutritionBaseAmount of
		// nutritionBaseUnitId". Convert the ingredient qty into that base
		// unit, then divide by the base amount to get the multiplier.
		const baseUnitId =
			product.nutritionBaseUnitId ?? product.defaultQuantityUnitId;
		const baseAmount = Number(product.nutritionBaseAmount ?? "1") || 1;
		const convertedQty = tryConvert(
			graph,
			Number(ing.quantity),
			ing.quantityUnitId,
			baseUnitId,
		);
		if (convertedQty === null) continue;

		const multiplier = (convertedQty * scaleFactor) / baseAmount;
		if (product.calories) calories += Number(product.calories) * multiplier;
		if (product.protein) protein += Number(product.protein) * multiplier;
		if (product.fat) fat += Number(product.fat) * multiplier;
		if (product.carbs) carbs += Number(product.carbs) * multiplier;
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
