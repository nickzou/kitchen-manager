import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface RecipePrepStep {
	id: string;
	recipeId: string;
	description: string;
	leadTimeMinutes: number;
	sortOrder: number;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateRecipePrepStepInput = {
	description: string;
	leadTimeMinutes: number;
	sortOrder?: number;
};

export type UpdateRecipePrepStepInput = Partial<CreateRecipePrepStepInput>;

export function useRecipePrepSteps(recipeId: string) {
	return useQuery<RecipePrepStep[]>({
		queryKey: ["recipes", recipeId, "prep-steps"],
		queryFn: async () => {
			const res = await fetch(`/api/recipes/${recipeId}/prep-steps`);
			if (!res.ok) throw new Error("Failed to fetch recipe prep steps");
			return res.json();
		},
	});
}

export function useCreateRecipePrepStep(recipeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateRecipePrepStepInput) => {
			const res = await fetch(`/api/recipes/${recipeId}/prep-steps`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create recipe prep step");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["recipes", recipeId, "prep-steps"],
			});
		},
	});
}

export function useUpdateRecipePrepStep(recipeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: UpdateRecipePrepStepInput & { id: string }) => {
			const res = await fetch(`/api/recipes/${recipeId}/prep-steps/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update recipe prep step");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["recipes", recipeId, "prep-steps"],
			});
		},
	});
}

export function useDeleteRecipePrepStep(recipeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/recipes/${recipeId}/prep-steps/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete recipe prep step");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["recipes", recipeId, "prep-steps"],
			});
		},
	});
}
