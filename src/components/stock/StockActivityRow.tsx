import { cn } from "#src/lib/utils";

const badgeClass: Record<string, string> = {
	add: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	consume:
		"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
	remove: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function StockActivityRow({
	transactionType,
	productName,
	quantity,
	unitAbbr,
	createdAt,
}: {
	transactionType: string;
	productName: string;
	quantity: string;
	unitAbbr: string;
	createdAt: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
			<span
				className={cn(
					"w-[4.5rem] shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold capitalize",
					badgeClass[transactionType],
				)}
			>
				{transactionType}
			</span>
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="font-medium text-(--sea-ink)">{productName}</span>
				<span className="text-xs text-(--sea-ink-soft)">
					{new Date(createdAt).toLocaleString()}
				</span>
			</div>
			<span className="shrink-0 text-(--sea-ink-soft)">
				{quantity}
				{unitAbbr ? ` ${unitAbbr}` : ""}
			</span>
		</div>
	);
}
