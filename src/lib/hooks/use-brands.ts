import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Brand {
	id: string;
	name: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateBrandInput = {
	name: string;
};

export type UpdateBrandInput = Partial<CreateBrandInput>;

export function useBrands() {
	return useQuery<Brand[]>({
		queryKey: ["brands"],
		queryFn: async () => {
			const res = await fetch("/api/brands");
			if (!res.ok) throw new Error("Failed to fetch brands");
			return res.json();
		},
	});
}

export function useBrand(id: string) {
	return useQuery<Brand>({
		queryKey: ["brands", id],
		queryFn: async () => {
			const res = await fetch(`/api/brands/${id}`);
			if (!res.ok) throw new Error("Failed to fetch brand");
			return res.json();
		},
	});
}

export function useCreateBrand() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateBrandInput) => {
			const res = await fetch("/api/brands", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create brand");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["brands"] });
		},
	});
}

export function useUpdateBrand(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateBrandInput) => {
			const res = await fetch(`/api/brands/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update brand");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["brands"] });
		},
	});
}

export function useDeleteBrand() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to delete brand");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["brands"] });
		},
	});
}
