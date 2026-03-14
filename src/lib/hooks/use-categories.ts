import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Category {
	id: string;
	name: string;
	description: string | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateCategoryInput = {
	name: string;
	description?: string;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// Product categories

export function useProductCategories() {
	return useQuery<Category[]>({
		queryKey: ["product-categories"],
		queryFn: async () => {
			const res = await fetch("/api/product-categories");
			if (!res.ok) throw new Error("Failed to fetch product categories");
			return res.json();
		},
	});
}

export function useProductCategory(id: string) {
	return useQuery<Category>({
		queryKey: ["product-categories", id],
		queryFn: async () => {
			const res = await fetch(`/api/product-categories/${id}`);
			if (!res.ok) throw new Error("Failed to fetch product category");
			return res.json();
		},
	});
}

export function useCreateProductCategory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateCategoryInput) => {
			const res = await fetch("/api/product-categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create product category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["product-categories"] });
		},
	});
}

export function useUpdateProductCategory(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateCategoryInput) => {
			const res = await fetch(`/api/product-categories/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update product category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["product-categories"] });
		},
	});
}

export function useDeleteProductCategory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/product-categories/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete product category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["product-categories"] });
		},
	});
}

// Recipe categories

export function useRecipeCategories() {
	return useQuery<Category[]>({
		queryKey: ["recipe-categories"],
		queryFn: async () => {
			const res = await fetch("/api/recipe-categories");
			if (!res.ok) throw new Error("Failed to fetch recipe categories");
			return res.json();
		},
	});
}

export function useRecipeCategory(id: string) {
	return useQuery<Category>({
		queryKey: ["recipe-categories", id],
		queryFn: async () => {
			const res = await fetch(`/api/recipe-categories/${id}`);
			if (!res.ok) throw new Error("Failed to fetch recipe category");
			return res.json();
		},
	});
}

export function useCreateRecipeCategory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateCategoryInput) => {
			const res = await fetch("/api/recipe-categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create recipe category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
		},
	});
}

export function useUpdateRecipeCategory(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateCategoryInput) => {
			const res = await fetch(`/api/recipe-categories/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update recipe category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
		},
	});
}

export function useDeleteRecipeCategory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/recipe-categories/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete recipe category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
		},
	});
}
