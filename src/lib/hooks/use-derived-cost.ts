import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DerivedCost } from "#src/lib/recipe-utils/derive-product-cost";

export type DerivedCostByProduct = Record<string, DerivedCost>;

export function useDerivedCostByProduct() {
	return useQuery<DerivedCostByProduct>({
		queryKey: ["derived-cost"],
		queryFn: async () => {
			const res = await fetch("/api/products/derived-cost");
			if (!res.ok) throw new Error("Failed to fetch derived cost");
			return res.json();
		},
	});
}

export function useDerivedCostMap() {
	const { data } = useDerivedCostByProduct();
	return useMemo(() => {
		const map = new Map<string, DerivedCost>();
		if (data) {
			for (const [id, v] of Object.entries(data)) {
				map.set(id, v);
			}
		}
		return map;
	}, [data]);
}
