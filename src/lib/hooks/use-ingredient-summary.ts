import { useQuery } from "@tanstack/react-query";

export interface IngredientSummaryItem {
	productId: string;
	productName: string;
	quantityUnitId: string | null;
	unitName: string | null;
	unitAbbreviation: string | null;
	neededQuantity: number;
	stockQuantity: number;
	status: "sufficient" | "deficit" | "unknown_unit";
}

export interface UnlinkedIngredient {
	notes: string | null;
	quantity: string;
	unitId: string | null;
	scaleFactor: number;
}

export interface IngredientSummaryResponse {
	ingredients: IngredientSummaryItem[];
	unlinkedIngredients: UnlinkedIngredient[];
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
