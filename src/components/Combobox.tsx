import { useEffect, useRef, useState } from "react";
import { cn } from "#/lib/utils";

interface ComboboxOption {
	value: string;
	label: string;
}

interface ComboboxProps {
	value: string;
	onChange: (value: string) => void;
	options: ComboboxOption[];
	placeholder?: string;
	className?: string;
	required?: boolean;
}

export function Combobox({
	value,
	onChange,
	options,
	placeholder = "Select…",
	className,
	required,
}: ComboboxProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

	const filtered = query
		? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
		: options;

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
				setQuery("");
			}
		}
		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	useEffect(() => {
		if (open && listRef.current) {
			const item = listRef.current.children[highlightedIndex] as
				| HTMLElement
				| undefined;
			item?.scrollIntoView({ block: "nearest" });
		}
	}, [highlightedIndex, open]);

	function resetHighlight() {
		setHighlightedIndex(0);
	}

	function select(optionValue: string) {
		onChange(optionValue);
		setQuery("");
		setOpen(false);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (!open) {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				setOpen(true);
				e.preventDefault();
			}
			return;
		}

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
				break;
			case "ArrowUp":
				e.preventDefault();
				setHighlightedIndex((i) => Math.max(i - 1, 0));
				break;
			case "Enter":
				e.preventDefault();
				if (filtered[highlightedIndex]) {
					select(filtered[highlightedIndex].value);
				}
				break;
			case "Escape":
				e.preventDefault();
				setOpen(false);
				setQuery("");
				break;
		}
	}

	const listId = "combobox-listbox";

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<input
				type="text"
				role="combobox"
				aria-expanded={open}
				aria-autocomplete="list"
				aria-controls={listId}
				value={open ? query : selectedLabel}
				placeholder={placeholder}
				required={required && !value}
				onFocus={() => {
					setOpen(true);
					setQuery("");
				}}
				onChange={(e) => {
					setQuery(e.target.value);
					resetHighlight();
					if (!open) setOpen(true);
				}}
				onKeyDown={handleKeyDown}
				className={cn(
					"h-10 w-full rounded-lg border border-(--line) bg-(--surface) px-3 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon)",
					!value && !open && "text-(--sea-ink-soft)",
				)}
			/>
			{open && filtered.length > 0 && (
				<div
					id={listId}
					ref={listRef}
					role="listbox"
					className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-(--line) bg-white py-1 shadow-lg dark:bg-[#1a2e30]"
				>
					{filtered.map((option, i) => (
						<div
							key={option.value}
							role="option"
							aria-selected={i === highlightedIndex}
							tabIndex={-1}
							onMouseDown={(e) => {
								e.preventDefault();
								select(option.value);
							}}
							onMouseEnter={() => setHighlightedIndex(i)}
							className={cn(
								"cursor-pointer px-3 py-2 text-sm text-(--sea-ink)",
								i === highlightedIndex &&
									"bg-[rgba(79,184,178,0.14)] text-(--lagoon-deep)",
							)}
						>
							{option.label}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
