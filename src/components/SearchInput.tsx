import { Search, X } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "#src/lib/utils";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
	onClear?: () => void;
};

export function SearchInput({
	className,
	value,
	onClear,
	...props
}: SearchInputProps) {
	return (
		<div className="relative flex-1">
			<Search
				size={16}
				className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--sea-ink-soft)"
			/>
			<input
				type="text"
				value={value}
				className={cn(
					"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 pl-9 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)",
					value && onClear && "pr-9",
					className,
				)}
				{...props}
			/>
			{value && onClear && (
				<button
					type="button"
					onClick={onClear}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-(--sea-ink-soft) transition hover:text-(--sea-ink)"
				>
					<X size={16} />
				</button>
			)}
		</div>
	);
}
