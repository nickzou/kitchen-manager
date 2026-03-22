import { Badge } from "#src/components/Badge";

const transactionColor: Record<string, "green" | "amber" | "red"> = {
	add: "green",
	consume: "amber",
	remove: "red",
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
		<div className="flex items-center gap-3 rounded-lg py-2 text-sm">
			<Badge
				color={transactionColor[transactionType] ?? "green"}
				className="w-18 shrink-0 capitalize"
			>
				{transactionType}
			</Badge>
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
