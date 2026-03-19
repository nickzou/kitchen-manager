import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "#src/lib/utils";

type AmberButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const AmberButton = forwardRef<HTMLButtonElement, AmberButtonProps>(
	({ className, ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={cn(
					"cursor-pointer rounded-full bg-amber-600 px-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50",
					"h-7",
					className,
				)}
				{...props}
			/>
		);
	},
);
