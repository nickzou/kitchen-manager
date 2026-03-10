import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface RecipeIngredient {
	id: string;
	recipeId: string;
	productId: string | null;
	quantity: string;
	quantityUnitId: string | null;
	notes: string | null;
	sortOrder: number;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateRecipeIngredientInput = {
	productId?: string;
	quantity: string;
	quantityUnitId?: string;
	notes?: string;
	sortOrder?: number;
};

export type UpdateRecipeIngredientInput = Partial<CreateRecipeIngredientInput>;

export function useRecipeIngredients(recipeId: string) {
	return useQuery<RecipeIngredient[]>({
		queryKey: ["recipes", recipeId, "ingredients"],
		queryFn: async () => {
			const res = await fetch(`/api/recipes/${recipeId}/ingredients`);
			if (!res.ok) throw new Error("Failed to fetch recipe ingredients");
			return res.json();
		},
	});
}

export function useCreateRecipeIngredient(recipeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateRecipeIngredientInput) => {
			const res = await fetch(`/api/recipes/${recipeId}/ingredients`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create recipe ingredient");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["recipes", recipeId, "ingredients"],
			});
		},
	});
}

export function useUpdateRecipeIngredient(recipeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: UpdateRecipeIngredientInput & { id: string }) => {
			const res = await fetch(`/api/recipes/${recipeId}/ingredients/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update recipe ingredient");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["recipes", recipeId, "ingredients"],
			});
		},
	});
}

export function useDeleteRecipeIngredient(recipeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/recipes/${recipeId}/ingredients/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete recipe ingredient");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["recipes", recipeId, "ingredients"],
			});
		},
	});
}
