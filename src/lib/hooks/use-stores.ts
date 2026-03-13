import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Store {
	id: string;
	name: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateStoreInput = {
	name: string;
};

export type UpdateStoreInput = Partial<CreateStoreInput>;

export function useStores() {
	return useQuery<Store[]>({
		queryKey: ["stores"],
		queryFn: async () => {
			const res = await fetch("/api/stores");
			if (!res.ok) throw new Error("Failed to fetch stores");
			return res.json();
		},
	});
}

export function useStore(id: string) {
	return useQuery<Store>({
		queryKey: ["stores", id],
		queryFn: async () => {
			const res = await fetch(`/api/stores/${id}`);
			if (!res.ok) throw new Error("Failed to fetch store");
			return res.json();
		},
	});
}

export function useCreateStore() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateStoreInput) => {
			const res = await fetch("/api/stores", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create store");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stores"] });
		},
	});
}

export function useUpdateStore(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateStoreInput) => {
			const res = await fetch(`/api/stores/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update store");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stores"] });
		},
	});
}

export function useDeleteStore() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to delete store");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stores"] });
		},
	});
}
