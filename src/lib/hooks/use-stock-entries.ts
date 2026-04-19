import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roundQty } from "#src/lib/round-qty";

export interface StockEntry {
	id: string;
	productId: string;
	quantity: string;
	expirationDate: string | null;
	purchaseDate: string | null;
	price: string | null;
	unitCost: string | null;
	storeId: string | null;
	brandId: string | null;
	tareWeight: string | null;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type CreateStockEntryInput = {
	productId: string;
	quantity: string;
	expirationDate?: string;
	purchaseDate?: string;
	price?: string;
	storeId?: string;
	brandId?: string;
	tareWeight?: string;
};

export type UpdateStockEntryInput = {
	quantity?: string;
	expirationDate?: string;
	purchaseDate?: string;
	price?: string;
	storeId?: string;
	brandId?: string;
	tareWeight?: string;
};

export type ConsumeStockInput = {
	stockEntryId: string;
	quantity: string;
};

export type SpoilStockInput = {
	stockEntryId: string;
	quantity: string;
};

export function useStockEntries(productId?: string) {
	return useQuery<StockEntry[]>({
		queryKey: productId ? ["stock-entries", { productId }] : ["stock-entries"],
		queryFn: async () => {
			const url = productId
				? `/api/stock-entries?productId=${productId}`
				: "/api/stock-entries";
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to fetch stock entries");
			return res.json();
		},
	});
}

export function useCreateStockEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateStockEntryInput) => {
			const res = await fetch("/api/stock-entries", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create stock entry");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}

export function useUpdateStockEntry(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateStockEntryInput) => {
			const res = await fetch(`/api/stock-entries/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update stock entry");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
		},
	});
}

export function useDeleteStockEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/stock-entries/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete stock entry");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}

export function useConsumeStock() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			input: ConsumeStockInput,
		): Promise<StockEntry & { stockLogId: string }> => {
			const res = await fetch("/api/stock-entries/consume", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to consume stock");
			return res.json();
		},
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: ["stock-entries"] });
			const previous = queryClient.getQueryData<StockEntry[]>([
				"stock-entries",
			]);
			queryClient.setQueryData<StockEntry[]>(["stock-entries"], (old) =>
				(old ?? [])
					.map((entry) =>
						entry.id === input.stockEntryId
							? {
									...entry,
									quantity: roundQty(
										Number.parseFloat(entry.quantity) -
											Number.parseFloat(input.quantity),
									).toString(),
								}
							: entry,
					)
					.filter((entry) => Number.parseFloat(entry.quantity) > 0),
			);
			return { previous };
		},
		onError: (_err, _input, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["stock-entries"], context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}

export function useSpoilStock() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			input: SpoilStockInput,
		): Promise<StockEntry & { stockLogId: string }> => {
			const res = await fetch("/api/stock-entries/spoil", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to spoil stock");
			return res.json();
		},
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: ["stock-entries"] });
			const previous = queryClient.getQueryData<StockEntry[]>([
				"stock-entries",
			]);
			queryClient.setQueryData<StockEntry[]>(["stock-entries"], (old) =>
				(old ?? [])
					.map((entry) =>
						entry.id === input.stockEntryId
							? {
									...entry,
									quantity: roundQty(
										Number.parseFloat(entry.quantity) -
											Number.parseFloat(input.quantity),
									).toString(),
								}
							: entry,
					)
					.filter((entry) => Number.parseFloat(entry.quantity) > 0),
			);
			return { previous };
		},
		onError: (_err, _input, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["stock-entries"], context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}
