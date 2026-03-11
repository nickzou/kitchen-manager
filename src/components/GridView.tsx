import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface GridViewProps<T> {
	items: T[];
	getKey: (item: T) => string;
	getLink: (item: T) => { to: string; params: Record<string, string> };
	renderCard: (item: T) => ReactNode;
	getImage?: (item: T) => string | null | undefined;
	getImageAlt?: (item: T) => string;
}

export function GridView<T>({
	items,
	getKey,
	getLink,
	renderCard,
	getImage,
	getImageAlt,
}: GridViewProps<T>) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((item) => {
				const link = getLink(item);
				const image = getImage?.(item);
				return (
					<Link
						key={getKey(item)}
						to={link.to}
						params={link.params}
						className={`block rounded-xl border border-(--line) bg-linear-165 from-(--surface-strong) to-(--surface) shadow-[inset_0_1px_0_var(--inset-glint),0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] backdrop-blur-xs ${image ? "overflow-hidden" : "p-4"} no-underline transition hover:-translate-y-0.5`}
					>
						{image && (
							<img
								src={image}
								alt={getImageAlt?.(item) ?? ""}
								className="h-24 w-full object-cover"
							/>
						)}
						<div className={image ? "p-4" : ""}>{renderCard(item)}</div>
					</Link>
				);
			})}
		</div>
	);
}
