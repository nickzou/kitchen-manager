import type { ReactNode } from "react";
import { cn } from "#src/lib/utils";

const variantClasses = {
	error: "text-red-600 dark:text-red-400",
	warning: "text-amber-600 dark:text-amber-400",
	success: "text-green-600 dark:text-green-400",
} as const;

interface AlertTextProps {
	variant?: keyof typeof variantClasses;
	className?: string;
	children: ReactNode;
}

export function AlertText({
	variant = "error",
	className,
	children,
}: AlertTextProps) {
	return (
		<p className={cn("text-sm", variantClasses[variant], className)}>
			{children}
		</p>
	);
}
