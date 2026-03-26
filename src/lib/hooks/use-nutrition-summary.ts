import { useQuery } from "@tanstack/react-query";

export type NutritionSummary = Record<
	string,
	{ calories: number; protein: number; fat: number; carbs: number }
>;

export function useNutritionSummary(startDate: string, endDate: string) {
	return useQuery<NutritionSummary>({
		queryKey: ["nutritionSummary", startDate, endDate],
		queryFn: async () => {
			const res = await fetch(
				`/api/meal-plan-entries/nutrition-summary?startDate=${startDate}&endDate=${endDate}`,
			);
			if (!res.ok) throw new Error("Failed to fetch nutrition summary");
			return res.json();
		},
	});
}
