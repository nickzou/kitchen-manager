import {
	type LinkComponentProps,
	Link as RouterLink,
} from "@tanstack/react-router";
import { cn } from "#src/lib/utils";

const baseClass =
	"relative no-underline text-(--sea-ink-soft) after:content-[''] after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[linear-gradient(90deg,var(--lagoon),#7ed3bf)] after:transition-transform after:duration-[170ms] hover:text-(--sea-ink) hover:after:scale-x-100";

const activeClass = "text-(--sea-ink) after:scale-x-100";

export function Link({ className, activeProps, ...props }: LinkComponentProps) {
	const resolvedActiveProps =
		typeof activeProps === "function" ? activeProps() : activeProps;
	return (
		<RouterLink
			className={cn(baseClass, className)}
			activeProps={{
				...resolvedActiveProps,
				className: cn(activeClass, resolvedActiveProps?.className),
			}}
			{...props}
		/>
	);
}
