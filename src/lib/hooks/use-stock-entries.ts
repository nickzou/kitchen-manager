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

export function useStockEntries(
	productId?: string,
	opts?: { includeConsumed?: boolean },
) {
	const includeConsumed = opts?.includeConsumed ?? false;
	return useQuery<StockEntry[]>({
		queryKey: ["stock-entries", { productId, includeConsumed }],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (productId) params.set("productId", productId);
			if (includeConsumed) params.set("includeConsumed", "true");
			const qs = params.toString();
			const url = qs ? `/api/stock-entries?${qs}` : "/api/stock-entries";
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
			queryClient.invalidateQueries({ queryKey: ["ingredient-summary"] });
			queryClient.invalidateQueries({ queryKey: ["recipe-availability"] });
			queryClient.invalidateQueries({ queryKey: ["cost-summary"] });
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
			queryClient.invalidateQueries({ queryKey: ["ingredient-summary"] });
			queryClient.invalidateQueries({ queryKey: ["recipe-availability"] });
			queryClient.invalidateQueries({ queryKey: ["cost-summary"] });
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
			queryClient.invalidateQueries({ queryKey: ["ingredient-summary"] });
			queryClient.invalidateQueries({ queryKey: ["recipe-availability"] });
			queryClient.invalidateQueries({ queryKey: ["cost-summary"] });
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
			// Apply optimistic update across every cached stock-entries query
			// (the keys now include productId + includeConsumed). Queries that
			// excluded consumed entries get the row filtered out; queries that
			// included them keep the row at quantity = 0.
			const snapshots = queryClient.getQueriesData<StockEntry[]>({
				queryKey: ["stock-entries"],
			});
			for (const [key] of snapshots) {
				const includeConsumed =
					(key[1] as { includeConsumed?: boolean } | undefined)
						?.includeConsumed ?? false;
				queryClient.setQueryData<StockEntry[]>(key, (old) =>
					applyConsumeOptimistic(old, input, includeConsumed),
				);
			}
			return { snapshots };
		},
		onError: (_err, _input, context) => {
			if (!context?.snapshots) return;
			for (const [key, value] of context.snapshots) {
				queryClient.setQueryData(key, value);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
			queryClient.invalidateQueries({ queryKey: ["ingredient-summary"] });
			queryClient.invalidateQueries({ queryKey: ["recipe-availability"] });
		},
	});
}

function applyConsumeOptimistic(
	old: StockEntry[] | undefined,
	input: ConsumeStockInput | SpoilStockInput,
	includeConsumed: boolean,
): StockEntry[] {
	const next = (old ?? []).map((entry) =>
		entry.id === input.stockEntryId
			? {
					...entry,
					quantity: roundQty(
						Number.parseFloat(entry.quantity) -
							Number.parseFloat(input.quantity),
					).toString(),
				}
			: entry,
	);
	return includeConsumed
		? next
		: next.filter((entry) => Number.parseFloat(entry.quantity) > 0);
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
			const snapshots = queryClient.getQueriesData<StockEntry[]>({
				queryKey: ["stock-entries"],
			});
			for (const [key] of snapshots) {
				const includeConsumed =
					(key[1] as { includeConsumed?: boolean } | undefined)
						?.includeConsumed ?? false;
				queryClient.setQueryData<StockEntry[]>(key, (old) =>
					applyConsumeOptimistic(old, input, includeConsumed),
				);
			}
			return { snapshots };
		},
		onError: (_err, _input, context) => {
			if (!context?.snapshots) return;
			for (const [key, value] of context.snapshots) {
				queryClient.setQueryData(key, value);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
			queryClient.invalidateQueries({ queryKey: ["ingredient-summary"] });
			queryClient.invalidateQueries({ queryKey: ["recipe-availability"] });
		},
	});
}
