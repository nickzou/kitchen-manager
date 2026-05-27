import { useToast } from "#src/components/Toast";
import { useProductUnitConversions } from "#src/lib/hooks/use-product-unit-conversions";
import type { Product } from "#src/lib/hooks/use-products";
import {
	type StockEntry,
	useConsumeStock,
} from "#src/lib/hooks/use-stock-entries";
import { useReverseStockLog } from "#src/lib/hooks/use-stock-logs";
import { useUnitConversions } from "#src/lib/hooks/use-unit-conversions";
import {
	buildConversionGraph,
	tryConvert,
} from "#src/lib/recipe-utils/conversion-graph";
import { roundQty } from "#src/lib/round-qty";
import { pickBestEntry } from "#src/lib/stock-utils";

/**
 * Shared "consume default amount from the best FIFO entry" flow used by the
 * stock view and the dashboard pinned section. Mirrors the logic that was
 * inlined in the stock route.
 */
export function useQuickConsume(opts: {
	products: Product[] | undefined;
	quantityUnits:
		| { id: string; abbreviation: string | null; name: string }[]
		| undefined;
}) {
	const { products, quantityUnits } = opts;
	const consumeStock = useConsumeStock();
	const reverseStockLog = useReverseStockLog();
	const { data: globalConversions } = useUnitConversions();
	const productIds = (products ?? []).map((p) => p.id);
	const { data: productConversions } = useProductUnitConversions(productIds);
	const toast = useToast();

	function getUnitAbbr(unitId: string | null) {
		if (!unitId) return "";
		const u = quantityUnits?.find((x) => x.id === unitId);
		return u?.abbreviation ?? u?.name ?? "";
	}

	async function quickConsume(entries: StockEntry[], amount: number) {
		const best = pickBestEntry(entries);
		if (!best) return;
		const product = products?.find((p) => p.id === best.productId);
		const name = product?.name ?? "Unknown";

		let finalAmount = amount;
		if (
			product?.defaultConsumeUnitId &&
			product.defaultQuantityUnitId &&
			product.defaultConsumeUnitId !== product.defaultQuantityUnitId
		) {
			const allConversions = [
				...(productConversions ?? []).filter((c) => c.productId === product.id),
				...(globalConversions ?? []),
			];
			const graph = buildConversionGraph(allConversions);
			const converted = tryConvert(
				graph,
				amount,
				product.defaultConsumeUnitId,
				product.defaultQuantityUnitId,
			);
			if (converted === null) {
				toast.error(`Cannot convert consume unit to stock unit for ${name}`);
				return;
			}
			finalAmount = roundQty(converted);
		}

		try {
			const result = await consumeStock.mutateAsync({
				stockEntryId: best.id,
				quantity: finalAmount.toString(),
			});
			const consumeUnit = product?.defaultConsumeUnitId
				? getUnitAbbr(product.defaultConsumeUnitId)
				: getUnitAbbr(product?.defaultQuantityUnitId ?? null);
			toast.success(
				`${amount}${consumeUnit ? ` ${consumeUnit}` : ""} ${name} consumed`,
				{
					label: "Undo",
					onClick: () =>
						reverseStockLog.mutate({
							stockLogId: result.stockLogId,
							stockEntryId: best.id,
						}),
				},
			);
		} catch {
			toast.error(`Failed to consume ${name}`);
		}
	}

	return { quickConsume, isPending: consumeStock.isPending };
}
