import type { ReactNode } from "react";

interface Column {
	label: string;
	className?: string;
}

interface TableViewProps<T> {
	columns: Column[];
	items: T[];
	getKey: (item: T) => string;
	renderRow: (item: T) => ReactNode;
}

export function TableView<T>({
	columns,
	items,
	getKey,
	renderRow,
}: TableViewProps<T>) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b border-(--line) text-xs font-semibold uppercase tracking-wide text-(--sea-ink-soft)">
						{columns.map((col, i) => (
							<th
								key={col.label}
								className={
									col.className ??
									(i < columns.length - 1 ? "pb-2 pr-4" : "pb-2")
								}
							>
								{col.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr
							key={getKey(item)}
							className="border-b border-(--line) last:border-0"
						>
							{renderRow(item)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
