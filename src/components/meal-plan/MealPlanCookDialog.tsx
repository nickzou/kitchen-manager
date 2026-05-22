import { useEffect, useState } from "react";
import { CookPicker } from "#src/components/recipes/CookPicker";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import { useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import {
	type RecipeIngredient,
	useRecipeIngredients,
} from "#src/lib/hooks/use-recipe-ingredients";

interface CookDialogProps {
	entry: MealPlanEntry;
	isCooking: boolean;
	onCook: (groupSelections?: Record<string, string>) => void;
	onCancel: () => void;
}

// Lazily fetches the entry's recipe ingredients. If any have a groupName
// the user picks one alternative per group; otherwise we cook immediately.
export function MealPlanCookDialog({
	entry,
	isCooking,
	onCook,
	onCancel,
}: CookDialogProps) {
	const { data: ingredients, isLoading } = useRecipeIngredients(entry.recipeId);
	const { data: products } = useProducts();
	const { data: units } = useQuantityUnits();
	const [selections, setSelections] = useState<Record<string, string>>({});
	const [decided, setDecided] = useState(false);

	useEffect(() => {
		if (decided || !ingredients) return;
		const groups = buildGroups(ingredients);
		if (groups.size === 0) {
			setDecided(true);
			onCook();
			return;
		}
		const defaults: Record<string, string> = {};
		for (const [name, ings] of groups) {
			defaults[name] = ings[0].id;
		}
		setSelections(defaults);
		setDecided(true);
	}, [ingredients, decided, onCook]);

	if (isLoading || !ingredients) return null;
	const groups = buildGroups(ingredients);
	if (groups.size === 0) return null;

	const scaleFactor =
		(entry.servings ?? entry.recipeServings ?? 1) / (entry.recipeServings ?? 1);

	const display = new Map(
		[...groups].map(([name, ings]) => [
			name,
			ings.map((ing) => ({
				ingredient: ing,
				productName:
					products?.find((p) => p.id === ing.productId)?.name ?? "Unknown",
				scaledQuantity: (Number(ing.quantity) * scaleFactor)
					.toFixed(2)
					.replace(/\.?0+$/, ""),
				unitLabel: ing.quantityUnitId
					? (units?.find((u) => u.id === ing.quantityUnitId)?.abbreviation ??
						units?.find((u) => u.id === ing.quantityUnitId)?.name ??
						null)
					: null,
			})),
		]),
	);

	return (
		<CookPicker
			open
			groups={display}
			selections={selections}
			onSelectionChange={(name, id) =>
				setSelections({ ...selections, [name]: id })
			}
			onCook={() => onCook(selections)}
			onCancel={onCancel}
			isCooking={isCooking}
		/>
	);
}

function buildGroups(
	ingredients: RecipeIngredient[],
): Map<string, RecipeIngredient[]> {
	const groups = new Map<string, RecipeIngredient[]>();
	for (const ing of ingredients) {
		if (!ing.groupName) continue;
		const list = groups.get(ing.groupName) ?? [];
		list.push(ing);
		groups.set(ing.groupName, list);
	}
	return groups;
}
