import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface UnitConversion {
	id: string;
	fromUnitId: string;
	toUnitId: string;
	factor: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateUnitConversionInput = {
	fromUnitId: string;
	toUnitId: string;
	factor: string;
};

export type UpdateUnitConversionInput = Partial<CreateUnitConversionInput>;

export function useUnitConversions() {
	return useQuery<UnitConversion[]>({
		queryKey: ["unit-conversions"],
		queryFn: async () => {
			const res = await fetch("/api/unit-conversions");
			if (!res.ok) throw new Error("Failed to fetch unit conversions");
			return res.json();
		},
	});
}

export function useUnitConversion(id: string) {
	return useQuery<UnitConversion>({
		queryKey: ["unit-conversions", id],
		queryFn: async () => {
			const res = await fetch(`/api/unit-conversions/${id}`);
			if (!res.ok) throw new Error("Failed to fetch unit conversion");
			return res.json();
		},
	});
}

export function useCreateUnitConversion() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateUnitConversionInput) => {
			const res = await fetch("/api/unit-conversions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create unit conversion");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["unit-conversions"] });
		},
	});
}

export function useUpdateUnitConversion(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateUnitConversionInput) => {
			const res = await fetch(`/api/unit-conversions/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update unit conversion");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["unit-conversions"] });
		},
	});
}

export function useDeleteUnitConversion() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/unit-conversions/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete unit conversion");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["unit-conversions"] });
		},
	});
}
