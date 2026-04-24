import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/src/style.css";
import { cn } from "#src/lib/utils";

interface DatePickerProps {
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Select date",
	className,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const selected = value ? new Date(`${value}T00:00:00`) : undefined;

	const currentYear = new Date().getFullYear();
	const startMonth = new Date(currentYear - 1, 0);
	const endMonth = new Date(currentYear + 10, 11);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	function handleSelect(date: Date | undefined) {
		if (date) {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			onChange(`${year}-${month}-${day}`);
		} else {
			onChange("");
		}
		setOpen(false);
	}

	const displayText = selected
		? selected.toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			})
		: placeholder;

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className={cn(
					"flex h-10 items-center gap-2 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm outline-none focus:border-(--lagoon) text-left",
					!value && "text-(--sea-ink-soft)",
					value && "text-(--sea-ink)",
					className,
				)}
			>
				<span className="flex-1">{displayText}</span>
				<Calendar size={14} className="shrink-0 text-(--sea-ink-soft)" />
			</button>
			{open && (
				<div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-(--line) bg-white p-2 shadow-lg dark:bg-[#1a2e30]">
					<DayPicker
						mode="single"
						selected={selected}
						onSelect={handleSelect}
						defaultMonth={selected}
						captionLayout="dropdown"
						startMonth={startMonth}
						endMonth={endMonth}
						style={
							{
								"--rdp-accent-color": "var(--lagoon)",
								"--rdp-accent-background-color": "rgba(79, 184, 178, 0.14)",
							} as React.CSSProperties
						}
					/>
				</div>
			)}
		</div>
	);
}
