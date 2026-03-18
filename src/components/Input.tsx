import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "#src/lib/utils";

export const inputClass =
	"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, ...props }, ref) => {
		return <input ref={ref} className={cn(inputClass, className)} {...props} />;
	},
);
