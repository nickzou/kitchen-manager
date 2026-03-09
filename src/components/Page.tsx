import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "#/lib/utils";

type PageProps<T extends ElementType = "div"> = {
	as?: T;
	className?: string;
	children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Page<T extends ElementType = "div">({
	as,
	className,
	...props
}: PageProps<T>) {
	const Comp = as || "div";
	return (
		<Comp className={cn("container mx-auto px-4", className)} {...props} />
	);
}
