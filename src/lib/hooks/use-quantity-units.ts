import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface QuantityUnit {
	id: string;
	name: string;
	abbreviation: string | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateQuantityUnitInput = {
	name: string;
	abbreviation?: string;
};

export type UpdateQuantityUnitInput = Partial<CreateQuantityUnitInput>;

export function useQuantityUnits() {
	return useQuery<QuantityUnit[]>({
		queryKey: ["quantity-units"],
		queryFn: async () => {
			const res = await fetch("/api/quantity-units");
			if (!res.ok) throw new Error("Failed to fetch quantity units");
			return res.json();
		},
	});
}

export function useQuantityUnit(id: string) {
	return useQuery<QuantityUnit>({
		queryKey: ["quantity-units", id],
		queryFn: async () => {
			const res = await fetch(`/api/quantity-units/${id}`);
			if (!res.ok) throw new Error("Failed to fetch quantity unit");
			return res.json();
		},
	});
}

export function useCreateQuantityUnit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateQuantityUnitInput) => {
			const res = await fetch("/api/quantity-units", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create quantity unit");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["quantity-units"] });
		},
	});
}

export function useUpdateQuantityUnit(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateQuantityUnitInput) => {
			const res = await fetch(`/api/quantity-units/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update quantity unit");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["quantity-units"] });
		},
	});
}

export function useDeleteQuantityUnit() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/quantity-units/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete quantity unit");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["quantity-units"] });
		},
	});
}
