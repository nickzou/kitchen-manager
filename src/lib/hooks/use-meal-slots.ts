import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface MealSlot {
	id: string;
	name: string;
	sortOrder: number;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateMealSlotInput = {
	name: string;
	sortOrder?: number;
};

export type UpdateMealSlotInput = {
	name?: string;
	sortOrder?: number;
};

export function useMealSlots() {
	return useQuery<MealSlot[]>({
		queryKey: ["meal-slots"],
		queryFn: async () => {
			const res = await fetch("/api/meal-slots");
			if (!res.ok) throw new Error("Failed to fetch meal slots");
			return res.json();
		},
	});
}

export function useMealSlot(id: string) {
	return useQuery<MealSlot>({
		queryKey: ["meal-slots", id],
		queryFn: async () => {
			const res = await fetch(`/api/meal-slots/${id}`);
			if (!res.ok) throw new Error("Failed to fetch meal slot");
			return res.json();
		},
	});
}

export function useCreateMealSlot() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateMealSlotInput) => {
			const res = await fetch("/api/meal-slots", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create meal slot");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-slots"] });
		},
	});
}

export function useUpdateMealSlot() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateMealSlotInput & { id: string }) => {
			const { id, ...updates } = input;
			const res = await fetch(`/api/meal-slots/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});
			if (!res.ok) throw new Error("Failed to update meal slot");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-slots"] });
		},
	});
}

export function useReorderMealSlots() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (orderedIds: string[]) => {
			const res = await fetch("/api/meal-slots/reorder", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orderedIds }),
			});
			if (!res.ok) throw new Error("Failed to reorder meal slots");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-slots"] });
		},
	});
}

export function useDeleteMealSlot() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/meal-slots/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete meal slot");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meal-slots"] });
			queryClient.invalidateQueries({ queryKey: ["meal-plan-entries"] });
		},
	});
}
