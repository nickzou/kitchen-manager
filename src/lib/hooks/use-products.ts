import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Product {
	id: string;
	name: string;
	category: string | null;
	description: string | null;
	image: string | null;
	expirationDate: string | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateProductInput = {
	name: string;
	category?: string;
	description?: string;
	image?: string;
	expirationDate?: string;
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
			if (!res.ok) throw new Error("Failed to create product");
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
			if (!res.ok) throw new Error("Failed to update product");
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
