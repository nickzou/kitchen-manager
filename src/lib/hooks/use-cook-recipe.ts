import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CookRecipeInput {
	recipeId: string;
	servings?: number;
}

interface CookRecipeResult {
	success: boolean;
	deductions: { productId: string; needed: number; deducted: number }[];
	warnings: string[];
	produced?: { productId: string; quantity: number };
}

export function useCookRecipe() {
	const queryClient = useQueryClient();
	return useMutation<CookRecipeResult, Error, CookRecipeInput>({
		mutationFn: async (input) => {
			const res = await fetch("/api/recipes/cook", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to cook recipe");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
			queryClient.invalidateQueries({ queryKey: ["stock-logs"] });
		},
	});
}
