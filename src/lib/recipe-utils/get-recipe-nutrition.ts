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

type Contribution = {
	calories: number;
	protein: number;
	fat: number;
	carbs: number;
};

export function getRecipeNutrition(opts: {
	ingredients: RecipeIngredient[];
	products: Product[];
	unitConversions: UnitConversion[];
	scaleFactor: number;
}): RecipeNutrition | null {
	const { ingredients, products, unitConversions, scaleFactor } = opts;

	const graph = buildConversionGraph(unitConversions);

	const ungrouped: Contribution[] = [];
	const grouped = new Map<string, Contribution[]>();
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
		const contribution: Contribution = {
			calories: product.calories ? Number(product.calories) * multiplier : 0,
			protein: product.protein ? Number(product.protein) * multiplier : 0,
			fat: product.fat ? Number(product.fat) * multiplier : 0,
			carbs: product.carbs ? Number(product.carbs) * multiplier : 0,
		};

		// Ingredient groups represent "OR" alternatives — the cook will use
		// one. Average across the contributors so the recipe total reflects
		// the typical case rather than summing every alternative as if all
		// were used.
		if (ing.groupName) {
			const bucket = grouped.get(ing.groupName) ?? [];
			bucket.push(contribution);
			grouped.set(ing.groupName, bucket);
		} else {
			ungrouped.push(contribution);
		}
		ingredientsWithNutrition++;
	}

	if (ingredientsWithNutrition === 0) return null;

	let calories = 0;
	let protein = 0;
	let fat = 0;
	let carbs = 0;

	for (const c of ungrouped) {
		calories += c.calories;
		protein += c.protein;
		fat += c.fat;
		carbs += c.carbs;
	}

	for (const bucket of grouped.values()) {
		if (bucket.length === 0) continue;
		const n = bucket.length;
		calories += bucket.reduce((s, c) => s + c.calories, 0) / n;
		protein += bucket.reduce((s, c) => s + c.protein, 0) / n;
		fat += bucket.reduce((s, c) => s + c.fat, 0) / n;
		carbs += bucket.reduce((s, c) => s + c.carbs, 0) / n;
	}

	return {
		calories,
		protein,
		fat,
		carbs,
		ingredientsWithNutrition,
		ingredientsTotal,
	};
}
