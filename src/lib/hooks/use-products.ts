import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Product {
	id: string;
	name: string;
	categoryIds: string[];
	description: string | null;
	image: string | null;
	defaultQuantityUnitId: string | null;
	minStockAmount: string;
	isFood: boolean;
	defaultExpirationDays: number | null;
	defaultConsumeAmount: string | null;
	defaultConsumeUnitId: string | null;
	calories: string | null;
	protein: string | null;
	fat: string | null;
	carbs: string | null;
	nutritionBaseAmount: string;
	nutritionBaseUnitId: string | null;
	defaultTareWeight: string | null;
	defaultSkipStockDeduction: boolean;
	pinned: boolean;
	pinnedSortOrder: number | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateProductInput = {
	name: string;
	categoryIds?: string[];
	description?: string;
	image?: string;
	isFood?: boolean;
	defaultQuantityUnitId?: string;
	minStockAmount?: string;
	defaultExpirationDays?: number;
	defaultConsumeAmount?: string;
	defaultConsumeUnitId?: string;
	calories?: string;
	protein?: string;
	fat?: string;
	carbs?: string;
	nutritionBaseAmount?: string;
	nutritionBaseUnitId?: string;
	defaultTareWeight?: string | null;
	defaultSkipStockDeduction?: boolean;
	pinned?: boolean;
	pinnedSortOrder?: number | null;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export function useProducts() {
	return useQuery<Product[]>({
		queryKey: ["products"],
		queryFn: async () => {
			const res = await fetch("/api/products");
			if (!res.ok) throw new Error("Failed to fetch products");
			return res.json();
		},
	});
}

export function useProduct(id: string) {
	return useQuery<Product>({
		queryKey: ["products", id],
		queryFn: async () => {
			const res = await fetch(`/api/products/${id}`);
			if (!res.ok) throw new Error("Failed to fetch product");
			return res.json();
		},
	});
}

export function useCreateProduct() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateProductInput) => {
			const res = await fetch("/api/products", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || "Failed to create product");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
	});
}

export function useUpdateProduct(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateProductInput) => {
			const res = await fetch(`/api/products/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || "Failed to update product");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
	});
}

export function useDeleteProduct() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to delete product");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
	});
}

export interface ProductSourceRecipe {
	id: string;
	name: string;
	producedQuantity: string | null;
	producedQuantityUnitId: string | null;
	derivedNutrition: {
		calories: number;
		protein: number;
		fat: number;
		carbs: number;
		baseAmount: number;
		baseUnitId: string | null;
		complete: boolean;
	} | null;
}

export function useProductSourceRecipes(id: string | null | undefined) {
	return useQuery<ProductSourceRecipe[]>({
		queryKey: ["products", id, "source-recipes"],
		queryFn: async () => {
			const res = await fetch(`/api/products/${id}/source-recipes`);
			if (!res.ok) throw new Error("Failed to fetch source recipes");
			return res.json();
		},
		enabled: Boolean(id),
	});
}
