import { useEffect, useMemo, useState } from "react";
import { CookPicker } from "#src/components/recipes/CookPicker";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import { useProductUnitConversions } from "#src/lib/hooks/use-product-unit-conversions";
import { useProducts } from "#src/lib/hooks/use-products";
import { useQuantityUnits } from "#src/lib/hooks/use-quantity-units";
import {
	type RecipeIngredient,
	useRecipeIngredients,
} from "#src/lib/hooks/use-recipe-ingredients";
import { useUnitConversions } from "#src/lib/hooks/use-unit-conversions";
import { buildConversionGraph } from "#src/lib/recipe-utils/conversion-graph";
import { formatConversion } from "#src/lib/recipe-utils/format-conversion";

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

	function getUnitLabel(unitId: string | null) {
		if (!unitId) return null;
		const u = units?.find((x) => x.id === unitId);
		return u?.abbreviation ?? u?.name ?? null;
	}

	function getConvertedDisplay(ing: RecipeIngredient): string | null {
		if (!ing.productId || !ing.quantityUnitId) return null;
		const product = products?.find((p) => p.id === ing.productId);
		if (!product?.defaultQuantityUnitId) return null;
		if (ing.quantityUnitId === product.defaultQuantityUnitId) return null;
		const allConversions = [
			...(productConversions ?? []).filter((c) => c.productId === product.id),
			...(globalConversions ?? []),
		];
		const graph = buildConversionGraph(allConversions);
		return formatConversion({
			quantity: Number(ing.quantity) * scaleFactor,
			fromUnitId: ing.quantityUnitId,
			toUnitId: product.defaultQuantityUnitId,
			toUnitLabel: getUnitLabel(product.defaultQuantityUnitId),
			graph,
		});
	}

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
				unitLabel: getUnitLabel(ing.quantityUnitId),
				convertedDisplay: getConvertedDisplay(ing),
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
