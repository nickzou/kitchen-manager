import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "#src/lib/utils";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function SearchInput({ className, ...props }: SearchInputProps) {
	return (
		<div className="relative mb-4">
			<Search
				size={16}
				className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--sea-ink-soft)"
			/>
			<input
				type="text"
				className={cn(
					"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 pl-9 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)",
					className,
				)}
				{...props}
			/>
		</div>
	);
}
