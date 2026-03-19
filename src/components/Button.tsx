import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "#src/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, size = "md", ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={cn(
					"cursor-pointer rounded-full bg-(--lagoon) text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50",
					size === "sm" ? "h-8 px-3" : "h-10 px-4",
					className,
				)}
				{...props}
			/>
		);
	},
);
