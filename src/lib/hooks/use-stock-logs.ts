import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface StockLog {
	id: string;
	stockEntryId: string | null;
	productId: string;
	transactionType: "add" | "consume" | "remove" | "spoiled";
	quantity: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type UpdateStockLogInput = {
	quantity?: string;
	transactionType?: "add" | "consume" | "remove" | "spoiled";
};

export function useStockLogs(productId?: string) {
	return useQuery<StockLog[]>({
		queryKey: productId ? ["stock-logs", { productId }] : ["stock-logs"],
		queryFn: async () => {
			const url = productId
				? `/api/stock-logs?productId=${productId}`
				: "/api/stock-logs";
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to fetch stock logs");
			return res.json();
		},
	});
}

export function useUpdateStockLog(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateStockLogInput) => {
			const res = await fetch(`/api/stock-logs/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to update stock log");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}

export function useReverseStockLog() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			stockLogId: string;
			stockEntryId?: string;
		}) => {
			const res = await fetch("/api/stock-logs/reverse", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to reverse stock log");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}

export function useDeleteStockLog() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/stock-logs/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete stock log");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}
