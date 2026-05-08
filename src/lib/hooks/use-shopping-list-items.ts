import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ShoppingListItem {
	id: string;
	productId: string;
	quantity: string;
	quantityUnitId: string | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateShoppingListItemInput = {
	productId: string;
	quantity: string;
	quantityUnitId?: string | null;
};

export type UpdateShoppingListItemInput = Partial<CreateShoppingListItemInput>;

export function useShoppingListItems() {
	return useQuery<ShoppingListItem[]>({
		queryKey: ["shopping-list-items"],
		queryFn: async () => {
			const res = await fetch("/api/shopping-list-items");
			if (!res.ok) throw new Error("Failed to fetch shopping list items");
			return res.json();
		},
	});
}

export function useCreateShoppingListItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateShoppingListItemInput) => {
			const res = await fetch("/api/shopping-list-items", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create shopping list item");
			return res.json() as Promise<ShoppingListItem>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shopping-list-items"] });
		},
	});
}

export function useUpdateShoppingListItem(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateShoppingListItemInput) => {
			const res = await fetch(`/api/shopping-list-items/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update shopping list item");
			return res.json() as Promise<ShoppingListItem>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shopping-list-items"] });
		},
	});
}

export function useDeleteShoppingListItem() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/shopping-list-items/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete shopping list item");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shopping-list-items"] });
		},
	});
}
