import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Recipe {
	id: string;
	name: string;
	description: string | null;
	servings: number | null;
	prepTime: number | null;
	cookTime: number | null;
	instructions: string | null;
	categoryId: string | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateRecipeInput = {
	name: string;
	description?: string;
	servings?: number;
	prepTime?: number;
	cookTime?: number;
	instructions?: string;
	categoryId?: string;
};

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

export function useRecipes() {
	return useQuery<Recipe[]>({
		queryKey: ["recipes"],
		queryFn: async () => {
			const res = await fetch("/api/recipes");
			if (!res.ok) throw new Error("Failed to fetch recipes");
			return res.json();
		},
	});
}

export function useRecipe(id: string) {
	return useQuery<Recipe>({
		queryKey: ["recipes", id],
		queryFn: async () => {
			const res = await fetch(`/api/recipes/${id}`);
			if (!res.ok) throw new Error("Failed to fetch recipe");
			return res.json();
		},
	});
}

export function useCreateRecipe() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateRecipeInput) => {
			const res = await fetch("/api/recipes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create recipe");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
		},
	});
}

export function useUpdateRecipe(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateRecipeInput) => {
			const res = await fetch(`/api/recipes/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update recipe");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
		},
	});
}

export function useDeleteRecipe() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to delete recipe");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recipes"] });
		},
	});
}
