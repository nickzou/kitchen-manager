import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "#src/lib/utils";

type IslandProps<T extends ElementType = "div"> = {
	as?: T;
	className?: string;
	children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

const baseClass =
	"sm:border border-(--line) bg-linear-165 from-(--surface-strong) to-(--surface) shadow-[inset_0_1px_0_var(--inset-glint),0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] backdrop-blur-xs";

export function Island<T extends ElementType = "div">({
	as,
	className,
	...props
}: IslandProps<T>) {
	const Comp = as || "div";
	return <Comp className={cn(baseClass, className)} {...props} />;
}
