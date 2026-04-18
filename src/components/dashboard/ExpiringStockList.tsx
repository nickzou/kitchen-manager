import { Link } from "@tanstack/react-router";
import { Skull, UtensilsCrossed } from "lucide-react";
import { Badge } from "#src/components/Badge";
import { NumberInput } from "#src/components/NumberInput";
import { AmberButton } from "#src/components/stock/AmberButton";
import type { Product } from "#src/lib/hooks/use-products";
import type { QuantityUnit } from "#src/lib/hooks/use-quantity-units";
import type { StockEntry } from "#src/lib/hooks/use-stock-entries";

type UrgencyBucket = "expired" | "today" | "3days" | "7days";

const bucketLabel: Record<UrgencyBucket, string> = {
	expired: "Expired",
	today: "Today",
	"3days": "< 3 days",
	"7days": "< 7 days",
};

const bucketColor: Record<UrgencyBucket, "red" | "amber"> = {
	expired: "red",
	today: "red",
	"3days": "amber",
	"7days": "amber",
};

function getBucket(expirationDate: string): UrgencyBucket | null {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const expiry = new Date(expirationDate);
	const expiryDay = new Date(
		expiry.getFullYear(),
		expiry.getMonth(),
		expiry.getDate(),
	);

	const diffMs = expiryDay.getTime() - today.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);

	if (diffDays < 0) return "expired";
	if (diffDays === 0) return "today";
	if (diffDays <= 3) return "3days";
	if (diffDays <= 7) return "7days";
	return null;
}

function formatDate(dateStr: string) {
	const d = new Date(dateStr);
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function ExpiringStockList({
	entries,
	products,
	quantityUnits,
	consumeAmounts,
	onConsumeAmountChange,
	onConsume,
	onConsumeAll,
	onSpoil,
	onSpoilAll,
	consumePending,
	spoilPending,
}: {
	entries: StockEntry[];
	products: Product[];
	quantityUnits: QuantityUnit[];
	consumeAmounts: Record<string, string>;
	onConsumeAmountChange: (entryId: string, value: string) => void;
	onConsume: (entryId: string) => void;
	onConsumeAll: (entryId: string) => void;
	onSpoil: (entryId: string) => void;
	onSpoilAll: (entryId: string) => void;
	consumePending: boolean;
	spoilPending: boolean;
}) {
	const productMap = new Map(products.map((p) => [p.id, p]));
	const unitMap = new Map(quantityUnits.map((u) => [u.id, u]));

	const expiringItems = entries
		.filter(
			(e) => e.expirationDate !== null && Number.parseFloat(e.quantity) > 0,
		)
		.map((e) => {
			const bucket = getBucket(e.expirationDate!);
			if (!bucket) return null;
			return { entry: e, bucket };
		})
		.filter(
			(item): item is { entry: StockEntry; bucket: UrgencyBucket } =>
				item !== null,
		)
		.sort(
			(a, b) =>
				new Date(a.entry.expirationDate!).getTime() -
				new Date(b.entry.expirationDate!).getTime(),
		)
		.slice(0, 10);

	if (expiringItems.length === 0) {
		return (
			<p className="py-4 text-center text-sm text-(--sea-ink-soft)">
				Nothing expiring soon — you're all set!
			</p>
		);
	}

	function getUnitAbbr(productId: string) {
		const product = productMap.get(productId);
		if (!product?.defaultQuantityUnitId) return "";
		const unit = unitMap.get(product.defaultQuantityUnitId);
		return unit?.abbreviation ?? unit?.name ?? "";
	}

	return (
		<div>
			<ul className="divide-y divide-(--line)">
				{expiringItems.map(({ entry, bucket }) => {
					const product = productMap.get(entry.productId);
					const unitAbbr = getUnitAbbr(entry.productId);
					return (
						<li key={entry.id} className="py-2.5 text-sm">
							<div className="flex items-center gap-3">
								<Badge color={bucketColor[bucket]} className="w-18 shrink-0">
									{bucketLabel[bucket]}
								</Badge>
								<span className="min-w-0 flex-1 truncate font-medium text-(--sea-ink)">
									{product?.name ?? "Unknown"}
								</span>
								<span className="shrink-0 text-(--sea-ink-soft)">
									{entry.quantity}
									{unitAbbr ? ` ${unitAbbr}` : ""}
								</span>
								<span className="shrink-0 text-xs text-(--sea-ink-soft)">
									{formatDate(entry.expirationDate!)}
								</span>
							</div>
							<div className="mt-1.5 flex items-center gap-1.5 pl-0 sm:pl-[calc(4.5rem+0.75rem)]">
								<NumberInput
									placeholder="Qty"
									step="any"
									min="0.01"
									max={entry.quantity}
									value={consumeAmounts[entry.id] ?? ""}
									onChange={(e) =>
										onConsumeAmountChange(entry.id, e.target.value)
									}
									className="h-7 w-16 rounded border bg-white px-2 text-xs sm:w-20 dark:bg-(--surface)"
								/>
								<button
									type="button"
									onClick={() => onSpoil(entry.id)}
									disabled={spoilPending || !consumeAmounts[entry.id]}
									title="Mark amount as spoiled"
									className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900 sm:w-auto sm:gap-1 sm:px-2.5"
								>
									<Skull size={12} />
									<span className="hidden sm:inline">Spoil</span>
								</button>
								<button
									type="button"
									onClick={() => onSpoilAll(entry.id)}
									disabled={
										spoilPending || Number.parseFloat(entry.quantity) <= 0
									}
									title="Mark all as spoiled"
									className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900 sm:w-auto sm:gap-1 sm:px-2.5"
								>
									<span className="sm:hidden">All</span>
									<span className="hidden sm:inline">Spoil All</span>
								</button>
								<AmberButton
									type="button"
									onClick={() => onConsume(entry.id)}
									disabled={consumePending || !consumeAmounts[entry.id]}
									className="flex items-center gap-1"
								>
									<UtensilsCrossed size={12} className="sm:hidden" />
									<span className="hidden sm:inline">Consume</span>
								</AmberButton>
								<AmberButton
									type="button"
									onClick={() => onConsumeAll(entry.id)}
									disabled={
										consumePending || Number.parseFloat(entry.quantity) <= 0
									}
									title="Consume all remaining stock"
									className="flex items-center gap-1 bg-amber-700"
								>
									<span className="sm:hidden">All</span>
									<span className="hidden sm:inline">Consume All</span>
								</AmberButton>
							</div>
						</li>
					);
				})}
			</ul>
			<div className="mt-3 text-center">
				<Link
					to="/stock"
					className="text-sm font-semibold text-(--lagoon-deep) hover:underline"
				>
					View all stock →
				</Link>
			</div>
		</div>
	);
}
