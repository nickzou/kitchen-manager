import { useQuery } from "@tanstack/react-query";

export type CostSummary = Record<string, { total: number; complete: boolean }>;

export function useCostSummary(startDate: string, endDate: string) {
	return useQuery<CostSummary>({
		queryKey: ["costSummary", startDate, endDate],
		queryFn: async () => {
			const res = await fetch(
				`/api/meal-plan-entries/cost-summary?startDate=${startDate}&endDate=${endDate}`,
			);
			if (!res.ok) throw new Error("Failed to fetch cost summary");
			return res.json();
		},
	});
}
