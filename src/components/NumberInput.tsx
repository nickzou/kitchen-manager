import type { InputHTMLAttributes } from "react";
import { cn } from "#src/lib/utils";
import { Input } from "./Input";

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function NumberInput({ className, ...props }: NumberInputProps) {
	return (
		<Input
			type="number"
			className={cn(
				"[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
				className,
			)}
			{...props}
		/>
	);
}
