import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "#src/lib/utils";

type AmberButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const AmberButton = forwardRef<HTMLButtonElement, AmberButtonProps>(
	({ className, ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={cn(
					"cursor-pointer bg-amber-600 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50",
					"flex h-7 w-7 items-center justify-center rounded-lg sm:w-auto sm:rounded-full sm:px-2.5",
					className,
				)}
				{...props}
			/>
		);
	},
);
