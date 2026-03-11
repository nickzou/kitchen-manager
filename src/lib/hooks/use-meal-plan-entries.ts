import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface MealPlanEntry {
	id: string;
	date: string;
	mealSlotId: string;
	recipeId: string;
	servings: number | null;
	sortOrder: number;
	cookedAt: string | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
	recipeName: string | null;
	recipeImage: string | null;
	recipeServings: number | null;
}

export type CreateMealPlanEntryInput = {
	date: string;
	mealSlotId: string;
	recipeId: string;
	servings?: number;
	sortOrder?: number;
};

export type UpdateMealPlanEntryInput = {
	date?: string;
	mealSlotId?: string;
	recipeId?: string;
	servings?: number | null;
	sortOrder?: number;
};

export function useMealPlanEntries(startDate: string, endDate: string) {
	return useQuery<MealPlanEntry[]>({
		queryKey: ["meal-plan-entries", { startDate, endDate }],
		queryFn: async () => {
			const res = await fetch(
				`/api/meal-plan-entries?startDate=${startDate}&endDate=${endDate}`,
			);
			if (!res.ok) throw new Error("Failed to fetch meal plan entries");
			return res.json();
		},
		enabled: !!startDate && !!endDate,
	});
}

export function useCreateMealPlanEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateMealPlanEntryInput) => {
			const res = await fetch("/api/meal-plan-entries", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create meal plan entry");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-plan-entries"] });
		},
	});
}

export function useUpdateMealPlanEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateMealPlanEntryInput & { id: string }) => {
			const { id, ...updates } = input;
			const res = await fetch(`/api/meal-plan-entries/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});
			if (!res.ok) throw new Error("Failed to update meal plan entry");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-plan-entries"] });
		},
	});
}

export function useDeleteMealPlanEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/meal-plan-entries/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete meal plan entry");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-plan-entries"] });
		},
	});
}

export function useCookMealPlanEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (mealPlanEntryId: string) => {
			const res = await fetch("/api/meal-plan-entries/cook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mealPlanEntryId }),
			});
			if (!res.ok) throw new Error("Failed to cook meal plan entry");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-plan-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}

export function useUncookMealPlanEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (mealPlanEntryId: string) => {
			const res = await fetch("/api/meal-plan-entries/cook", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mealPlanEntryId }),
			});
			if (!res.ok) throw new Error("Failed to uncook meal plan entry");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-plan-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}
