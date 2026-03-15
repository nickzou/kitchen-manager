import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface CompactViewProps<T> {
	items: T[];
	getKey: (item: T) => string;
	getLink: (item: T) => { to: string; params: Record<string, string> };
	getName: (item: T) => string;
	getSecondary: (item: T) => string;
	renderExtra?: (item: T) => ReactNode;
}

export function CompactView<T>({
	items,
	getKey,
	getLink,
	getName,
	getSecondary,
	renderExtra,
}: CompactViewProps<T>) {
	return (
		<div className="flex flex-col gap-1">
			{items.map((item) => {
				const link = getLink(item);
				return (
					<Link
						key={getKey(item)}
						to={link.to}
						params={link.params}
						className="flex items-center justify-between rounded-lg px-3 py-2 no-underline transition hover:bg-(--surface)"
					>
						<span className="flex items-center gap-2 text-sm font-medium text-(--sea-ink)">
							{renderExtra?.(item)}
							{getName(item)}
						</span>
						<span className="text-xs text-(--sea-ink-soft)">
							{getSecondary(item)}
						</span>
					</Link>
				);
			})}
		</div>
	);
}
