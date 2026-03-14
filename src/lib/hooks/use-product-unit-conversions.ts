import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ProductUnitConversion {
	id: string;
	productId: string;
	fromUnitId: string;
	toUnitId: string;
	factor: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateProductUnitConversionInput = {
	fromUnitId: string;
	toUnitId: string;
	factor: string;
};

export type UpdateProductUnitConversionInput =
	Partial<CreateProductUnitConversionInput>;

export function useProductUnitConversions(productId: string) {
	return useQuery<ProductUnitConversion[]>({
		queryKey: ["product-unit-conversions", productId],
		queryFn: async () => {
			const res = await fetch(`/api/products/${productId}/unit-conversions`);
			if (!res.ok) throw new Error("Failed to fetch product unit conversions");
			return res.json();
		},
		enabled: !!productId,
	});
}

export function useCreateProductUnitConversion(productId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateProductUnitConversionInput) => {
			const res = await fetch(`/api/products/${productId}/unit-conversions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create product unit conversion");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["product-unit-conversions", productId],
			});
		},
	});
}

export function useUpdateProductUnitConversion(
	productId: string,
	conversionId: string,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateProductUnitConversionInput) => {
			const res = await fetch(
				`/api/products/${productId}/unit-conversions/${conversionId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				},
			);
			if (!res.ok) throw new Error("Failed to update product unit conversion");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["product-unit-conversions", productId],
			});
		},
	});
}

export function useDeleteProductUnitConversion(productId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (conversionId: string) => {
			const res = await fetch(
				`/api/products/${productId}/unit-conversions/${conversionId}`,
				{
					method: "DELETE",
				},
			);
			if (!res.ok) throw new Error("Failed to delete product unit conversion");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["product-unit-conversions", productId],
			});
		},
	});
}
