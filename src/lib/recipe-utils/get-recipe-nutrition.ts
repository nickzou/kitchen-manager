import type { ProductUnitConversion } from "#src/lib/hooks/use-product-unit-conversions";
import type { Product } from "#src/lib/hooks/use-products";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { buildConversionGraph, tryConvert } from "./conversion-graph";
import type { DerivedNutrition } from "./derive-product-nutrition";

export interface RecipeNutrition {
	calories: number;
	protein: number;
	fat: number;
	carbs: number;
	ingredientsWithNutrition: number;
	ingredientsTotal: number;
	// True iff every ingredient with nonzero macro data was successfully
	// resolved (either from the product itself or from a derived source
	// recipe). False if any ingredient was skipped due to a unit-conversion
	// gap or missing product / missing derived entry.
	complete: boolean;
}

type Contribution = {
	calories: number;
	protein: number;
	fat: number;
	carbs: number;
};

type NutritionFacts = {
	baseUnitId: string | null;
	baseAmount: number;
	calories: number;
	protein: number;
	fat: number;
	carbs: number;
};

function productFacts(product: Product): NutritionFacts | null {
	if (!product.calories && !product.protein && !product.fat && !product.carbs)
		return null;
	return {
		baseUnitId: product.nutritionBaseUnitId ?? product.defaultQuantityUnitId,
		baseAmount: Number(product.nutritionBaseAmount ?? "1") || 1,
		calories: product.calories ? Number(product.calories) : 0,
		protein: product.protein ? Number(product.protein) : 0,
		fat: product.fat ? Number(product.fat) : 0,
		carbs: product.carbs ? Number(product.carbs) : 0,
	};
}

function derivedFacts(derived: DerivedNutrition): NutritionFacts | null {
	if (!derived.calories && !derived.protein && !derived.fat && !derived.carbs)
		return null;
	return {
		baseUnitId: derived.baseUnitId,
		baseAmount: derived.baseAmount || 1,
		calories: derived.calories,
		protein: derived.protein,
		fat: derived.fat,
		carbs: derived.carbs,
	};
}

export function getRecipeNutrition(opts: {
	ingredients: RecipeIngredient[];
	products: Product[];
	unitConversions: UnitConversion[];
	// Per-product unit conversions for the recipe's products. These are
	// applied as a per-product graph so two products that both define
	// e.g. `tsp -> g` with different factors don't collide in a single
	// shared graph (which would drop one product's factor at random).
	productConversions?: ProductUnitConversion[];
	scaleFactor: number;
	// Optional per-product derived nutrition map for producible products
	// (calories live on the source recipe). Falls back to product macros
	// when an entry is missing.
	derivedByProduct?: Map<string, DerivedNutrition>;
}): RecipeNutrition | null {
	const {
		ingredients,
		products,
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

	const ungrouped: Contribution[] = [];
	const grouped = new Map<string, Contribution[]>();
	let ingredientsWithNutrition = 0;
	const ingredientsTotal = ingredients.length;
	let complete = true;

	for (const ing of ingredients) {
		if (!ing.productId) continue;
		const product = products.find((p) => p.id === ing.productId);
		if (!product) {
			complete = false;
			continue;
		}

		// Prefer the product's own macros; fall back to a derived source-recipe
		// rollup when the product has no nutrition of its own.
		const own = productFacts(product);
		const derived = derivedByProduct?.get(ing.productId);
		const facts = own ?? (derived ? derivedFacts(derived) : null);
		if (!facts) continue;

		const convertedQty = tryConvert(
			graphFor(ing.productId),
			Number(ing.quantity),
			ing.quantityUnitId,
			facts.baseUnitId,
		);
		if (convertedQty === null) {
			complete = false;
			continue;
		}

		const multiplier = (convertedQty * scaleFactor) / facts.baseAmount;
		const contribution: Contribution = {
			calories: facts.calories * multiplier,
			protein: facts.protein * multiplier,
			fat: facts.fat * multiplier,
			carbs: facts.carbs * multiplier,
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
		if (derived && !derived.complete) complete = false;
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
		complete,
	};
}
