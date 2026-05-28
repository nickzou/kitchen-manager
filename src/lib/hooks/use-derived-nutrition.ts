import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DerivedNutrition } from "#src/lib/recipe-utils/derive-product-nutrition";

export type DerivedNutritionByProduct = Record<string, DerivedNutrition>;

export function useDerivedNutritionByProduct() {
	return useQuery<DerivedNutritionByProduct>({
		queryKey: ["derived-nutrition"],
		queryFn: async () => {
			const res = await fetch("/api/products/derived-nutrition");
			if (!res.ok) throw new Error("Failed to fetch derived nutrition");
			return res.json();
		},
	});
}

/**
 * Returns a stable Map view of the derived nutrition record so consumers can
 * pass it straight into `getRecipeNutrition`.
 */
export function useDerivedNutritionMap() {
	const { data } = useDerivedNutritionByProduct();
	return useMemo(() => {
		const map = new Map<string, DerivedNutrition>();
		if (data) {
			for (const [id, v] of Object.entries(data)) {
				map.set(id, v);
			}
		}
		return map;
	}, [data]);
}
