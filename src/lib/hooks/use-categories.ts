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

export function useCategories() {
	return useQuery<Category[]>({
		queryKey: ["categories"],
		queryFn: async () => {
			const res = await fetch("/api/categories");
			if (!res.ok) throw new Error("Failed to fetch categories");
			return res.json();
		},
	});
}

export function useCategory(id: string) {
	return useQuery<Category>({
		queryKey: ["categories", id],
		queryFn: async () => {
			const res = await fetch(`/api/categories/${id}`);
			if (!res.ok) throw new Error("Failed to fetch category");
			return res.json();
		},
	});
}

export function useCreateCategory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateCategoryInput) => {
			const res = await fetch("/api/categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
	});
}

export function useUpdateCategory(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateCategoryInput) => {
			const res = await fetch(`/api/categories/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
	});
}

export function useDeleteCategory() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to delete category");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["categories"] });
		},
	});
}
