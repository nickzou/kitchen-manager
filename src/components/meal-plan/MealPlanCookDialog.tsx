import { useMemo } from "react";
import { CookAdjustModal } from "#src/components/recipes/CookAdjustModal";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import { useProductUnitConversions } from "#src/lib/hooks/use-product-unit-conversions";
import { useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import { useRecipeIngredients } from "#src/lib/hooks/use-recipe-ingredients";
import { useUnitConversions } from "#src/lib/hooks/use-unit-conversions";

interface CookInput {
	ingredientOverrides?: Record<
		string,
		{ quantity: string; quantityUnitId: string | null }
	>;
	skippedIngredients?: string[];
	groupSelections?: Record<string, string>;
}

interface CookDialogProps {
	entry: MealPlanEntry;
	isCooking: boolean;
	onCook: (input: CookInput) => void;
	onCancel: () => void;
}

export function MealPlanCookDialog({
	entry,
	isCooking,
	onCook,
	onCancel,
}: CookDialogProps) {
	const { data: ingredients, isLoading } = useRecipeIngredients(entry.recipeId);
	const { data: products } = useProducts();
	const { data: units } = useQuantityUnits();
	const { data: globalConversions } = useUnitConversions();
	const ingredientProductIds = useMemo(
		() =>
			Array.from(
				new Set(
					(ingredients ?? [])
						.map((i) => i.productId)
						.filter((id): id is string => !!id),
				),
			),
		[ingredients],
	);
	const { data: productConversions } =
		useProductUnitConversions(ingredientProductIds);

	if (isLoading || !ingredients) return null;

	const scaleFactor =
		(entry.servings ?? entry.recipeServings ?? 1) / (entry.recipeServings ?? 1);

	return (
		<CookAdjustModal
			open
			recipeName={entry.recipeName ?? "recipe"}
			ingredients={ingredients}
			products={products ?? []}
			quantityUnits={units ?? []}
			unitConversions={globalConversions ?? []}
			productConversions={productConversions ?? []}
			scaleFactor={scaleFactor}
			isCooking={isCooking}
			onCancel={onCancel}
			onCook={(input) => onCook(input)}
			onCookAsIs={(input) => onCook({ groupSelections: input.groupSelections })}
		/>
	);
}
