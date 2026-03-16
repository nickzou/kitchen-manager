import type { ReactNode } from "react";
import { cn } from "#src/lib/utils";

const variantClasses = {
	error:
		"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
	warning:
		"border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
	success:
		"border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300",
} as const;

interface AlertBoxProps {
	variant?: keyof typeof variantClasses;
	className?: string;
	children: ReactNode;
}

export function AlertBox({
	variant = "error",
	className,
	children,
}: AlertBoxProps) {
	return (
		<div
			className={cn(
				"rounded-lg border p-4 text-sm",
				variantClasses[variant],
				className,
			)}
		>
			{children}
		</div>
	);
}
