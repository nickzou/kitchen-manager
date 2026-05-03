import { useQuery } from "@tanstack/react-query";

export interface IngredientRecipeRef {
	recipeId: string;
	recipeName: string;
	mealPlanEntryId: string;
	mealPlanEntryDate: string;
	quantity: number;
}

export interface IngredientSummaryItem {
	productId: string;
	productName: string;
	quantityUnitId: string | null;
	unitName: string | null;
	unitAbbreviation: string | null;
	neededQuantity: number;
	minStockBuffer: number;
	stockQuantity: number;
	status: "sufficient" | "deficit" | "unknown_unit";
	recipes: IngredientRecipeRef[];
}

export interface UnlinkedIngredient {
	notes: string | null;
	quantity: string;
	unitId: string | null;
	scaleFactor: number;
	recipes: IngredientRecipeRef[];
}

export interface RestockItem {
	productId: string;
	productName: string;
	quantityUnitId: string | null;
	unitName: string | null;
	unitAbbreviation: string | null;
	minStock: number;
	stockQuantity: number;
}

export interface IngredientSummaryResponse {
	ingredients: IngredientSummaryItem[];
	unlinkedIngredients: UnlinkedIngredient[];
	restock: RestockItem[];
}

export function useIngredientSummary(startDate: string, endDate: string) {
	return useQuery<IngredientSummaryResponse>({
		queryKey: ["ingredient-summary", { startDate, endDate }],
		queryFn: async () => {
			const res = await fetch(
				`/api/meal-plan-entries/ingredient-summary?startDate=${startDate}&endDate=${endDate}`,
			);
			if (!res.ok) throw new Error("Failed to fetch ingredient summary");
			return res.json();
		},
		enabled: !!startDate && !!endDate,
	});
}
