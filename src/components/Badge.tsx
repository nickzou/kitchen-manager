import type { ReactNode } from "react";
import { cn } from "#src/lib/utils";

const colorClasses: Record<string, string> = {
	green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
	red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function Badge({
	color,
	className,
	children,
}: {
	color: keyof typeof colorClasses;
	className?: string;
	children: ReactNode;
}) {
	return (
		<span
			className={cn(
				"rounded-full px-2 py-0.5 text-center text-xs font-semibold",
				colorClasses[color],
				className,
			)}
		>
			{children}
		</span>
	);
}
