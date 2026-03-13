import { cn } from "#src/lib/utils";

export function StockProductTrigger({
	product,
	totalStock,
	unitAbbr,
	categoryName,
}: {
	product: { name: string; minStockAmount: string };
	totalStock: number;
	unitAbbr: string;
	categoryName: string | null;
}) {
	const isLow =
		Number.parseFloat(product.minStockAmount) > 0 &&
		totalStock < Number.parseFloat(product.minStockAmount);

	return (
		<>
			<span className="flex-1 text-sm font-medium text-(--sea-ink)">
				{product.name}
				{categoryName && (
					<span className="ml-2 rounded-full bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-medium text-(--lagoon-deep)">
						{categoryName}
					</span>
				)}
			</span>
			<span
				className={cn(
					"text-sm font-semibold",
					isLow ? "text-red-600 dark:text-red-400" : "text-(--sea-ink)",
				)}
			>
				{totalStock}
				{unitAbbr ? ` ${unitAbbr}` : ""}
				{isLow && " ⚠"}
			</span>
		</>
	);
}
