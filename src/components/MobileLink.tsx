import {
	type LinkComponentProps,
	Link as RouterLink,
} from "@tanstack/react-router";
import { cn } from "#src/lib/utils";

export function MobileLink({ className, ...props }: LinkComponentProps) {
	return (
		<RouterLink
			className={cn(
				"text-(--lagoon-deep) decoration-[rgba(50,143,151,0.4)] decoration-1 underline-offset-2 hover:text-[#246f76]",
				className,
			)}
			{...props}
		/>
	);
}
