import { cn } from "#/lib/utils";

type NumberInputProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"type"
>;

export function NumberInput({ className, ...props }: NumberInputProps) {
	return (
		<input
			type="number"
			className={cn(
				"h-10 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon) [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
				className,
			)}
			{...props}
		/>
	);
}
