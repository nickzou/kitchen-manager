import { Check, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "#src/components/Input";
import { cn } from "#src/lib/utils";

interface MultiComboboxOption {
	value: string;
	label: string;
}

interface MultiComboboxProps {
	value: string[];
	onChange: (value: string[]) => void;
	options: MultiComboboxOption[];
	placeholder?: string;
	className?: string;
	onCreateNew?: (query: string) => void;
}

export function MultiCombobox({
	value,
	onChange,
	options,
	placeholder = "Select\u2026",
	className,
	onCreateNew,
}: MultiComboboxProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const selectedLabels = value
		.map((v) => options.find((o) => o.value === v)?.label)
		.filter(Boolean) as string[];

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

	function toggle(optionValue: string) {
		if (value.includes(optionValue)) {
			onChange(value.filter((v) => v !== optionValue));
		} else {
			onChange([...value, optionValue]);
		}
		setQuery("");
	}

	function remove(optionValue: string) {
		onChange(value.filter((v) => v !== optionValue));
	}

	const showCreateRow = !!onCreateNew && query.trim().length > 0;
	const totalItems = filtered.length + (showCreateRow ? 1 : 0);
	const createRowIndex = filtered.length;

	function handleCreateNew() {
		if (onCreateNew && query.trim()) {
			onCreateNew(query.trim());
			setQuery("");
		}
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
				setHighlightedIndex((i) => Math.min(i + 1, totalItems - 1));
				break;
			case "ArrowUp":
				e.preventDefault();
				setHighlightedIndex((i) => Math.max(i - 1, 0));
				break;
			case "Enter":
				e.preventDefault();
				if (highlightedIndex === createRowIndex && showCreateRow) {
					handleCreateNew();
				} else if (filtered[highlightedIndex]) {
					toggle(filtered[highlightedIndex].value);
				}
				break;
			case "Escape":
				e.preventDefault();
				setOpen(false);
				setQuery("");
				break;
		}
	}

	const listId = "multi-combobox-listbox";

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			{selectedLabels.length > 0 && (
				<div className="mb-1.5 flex flex-wrap gap-1.5">
					{value.map((v, i) => (
						<span
							key={v}
							className="inline-flex items-center gap-1 rounded-full bg-[rgba(79,184,178,0.14)] px-2 py-0.5 text-xs font-medium text-(--lagoon-deep)"
						>
							{selectedLabels[i]}
							<button
								type="button"
								onClick={() => remove(v)}
								className="rounded-full p-0.5 hover:bg-[rgba(79,184,178,0.25)]"
							>
								<X size={10} />
							</button>
						</span>
					))}
				</div>
			)}
			<input
				type="text"
				role="combobox"
				aria-expanded={open}
				aria-autocomplete="list"
				aria-controls={listId}
				value={query}
				placeholder={placeholder}
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
				className={inputClass}
			/>
			{open && totalItems > 0 && (
				<div
					id={listId}
					ref={listRef}
					role="listbox"
					className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-(--line) bg-white py-1 shadow-lg dark:bg-[#1a2e30]"
				>
					{filtered.map((option, i) => {
						const selected = value.includes(option.value);
						return (
							<div
								key={option.value}
								role="option"
								aria-selected={selected}
								tabIndex={-1}
								onMouseDown={(e) => {
									e.preventDefault();
									toggle(option.value);
								}}
								onMouseEnter={() => setHighlightedIndex(i)}
								className={cn(
									"flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-(--sea-ink)",
									i === highlightedIndex &&
										"bg-[rgba(79,184,178,0.14)] text-(--lagoon-deep)",
								)}
							>
								<span className="w-4 shrink-0">
									{selected && <Check size={14} />}
								</span>
								{option.label}
							</div>
						);
					})}
					{showCreateRow && (
						<div
							role="option"
							aria-selected={highlightedIndex === createRowIndex}
							tabIndex={-1}
							onMouseDown={(e) => {
								e.preventDefault();
								handleCreateNew();
							}}
							onMouseEnter={() => setHighlightedIndex(createRowIndex)}
							className={cn(
								"flex cursor-pointer items-center gap-1.5 border-t border-(--line) px-3 py-2 text-sm font-medium text-(--lagoon-deep)",
								highlightedIndex === createRowIndex &&
									"bg-[rgba(79,184,178,0.14)]",
							)}
						>
							<Plus size={14} />
							Create &ldquo;{query.trim()}&rdquo;
						</div>
					)}
				</div>
			)}
		</div>
	);
}
