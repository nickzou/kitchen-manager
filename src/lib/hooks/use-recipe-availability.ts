import { useQuery } from "@tanstack/react-query";

export type RecipeAvailability = Record<
	string,
	"sufficient" | "deficit" | "no-ingredients"
>;

export function useRecipeAvailability() {
	return useQuery<RecipeAvailability>({
		queryKey: ["recipe-availability"],
		queryFn: async () => {
			const res = await fetch("/api/recipes/availability");
			if (!res.ok) throw new Error("Failed to fetch recipe availability");
			return res.json();
		},
	});
}
