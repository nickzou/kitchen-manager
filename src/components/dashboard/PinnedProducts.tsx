import { UtensilsCrossed } from "lucide-react";
import { useMemo } from "react";
import { AmberButton } from "#src/components/stock/AmberButton";
import type { Product } from "#src/lib/hooks/use-products";
import type { QuantityUnit } from "#src/lib/hooks/use-quantity-units";
import { useQuickConsume } from "#src/lib/hooks/use-quick-consume";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";
import { PinToggle } from "../PinToggle";

interface PinnedProductsProps {
	products: Product[];
	stockEntries: StockEntry[];
	quantityUnits: QuantityUnit[];
}

export function PinnedProducts({
	products,
	stockEntries,
	quantityUnits,
}: PinnedProductsProps) {
	const { quickConsume, isPending } = useQuickConsume({
		products,
		quantityUnits,
	});

	const pinned = useMemo(() => {
		return products
			.filter((p) => {
				if (!p.pinned) return false;
				const total = stockEntries
					.filter((e) => e.productId === p.id)
					.reduce((s, e) => s + Number.parseFloat(e.quantity), 0);
				return total > 0;
			})
			.sort((a, b) => {
				const ao = a.pinnedSortOrder ?? Number.POSITIVE_INFINITY;
				const bo = b.pinnedSortOrder ?? Number.POSITIVE_INFINITY;
				if (ao !== bo) return ao - bo;
				return a.name.localeCompare(b.name);
			});
	}, [products, stockEntries]);

	function getUnitAbbr(unitId: string | null) {
		if (!unitId) return "";
		const u = quantityUnits.find((x) => x.id === unitId);
		return u?.abbreviation ?? u?.name ?? "";
	}

	if (pinned.length === 0) return null;

	return (
		<div className="mb-8">
			<h2 className="mb-3 text-base font-semibold text-(--sea-ink)">Pinned</h2>
			<ul className="flex flex-col divide-y divide-(--line) rounded-xl border border-(--line) bg-(--surface)">
				{pinned.map((p) => {
					const entries = stockEntries.filter((e) => e.productId === p.id);
					const totalStock = entries.reduce(
						(s, e) => s + Number.parseFloat(e.quantity),
						0,
					);
					const stockUnit = getUnitAbbr(p.defaultQuantityUnitId);
					const consumeAmount = p.defaultConsumeAmount
						? Number.parseFloat(p.defaultConsumeAmount)
						: 1;
					const consumeUnit = getUnitAbbr(
						p.defaultConsumeUnitId ?? p.defaultQuantityUnitId,
					);
					return (
						<li
							key={p.id}
							className="flex items-center gap-3 px-3 py-2 text-sm"
						>
							<span className="min-w-0 flex-1 truncate font-medium text-(--sea-ink)">
								{p.name}
							</span>
							<span className="shrink-0 font-semibold text-(--sea-ink)">
								{totalStock}
								{stockUnit ? ` ${stockUnit}` : ""}
							</span>
							<span className="shrink-0 text-xs text-(--sea-ink-soft)">
								({consumeAmount}
								{consumeUnit ? ` ${consumeUnit}` : ""})
							</span>
							<PinToggle
								productId={p.id}
								productName={p.name}
								pinned={p.pinned}
							/>
							<AmberButton
								type="button"
								onClick={() => quickConsume(entries, consumeAmount)}
								disabled={isPending}
								title={`Consume ${consumeAmount}${consumeUnit ? ` ${consumeUnit}` : ""}`}
								className="flex shrink-0 items-center gap-1"
							>
								<UtensilsCrossed size={12} className="sm:hidden" />
								<span className="hidden sm:inline">Consume</span>
							</AmberButton>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
