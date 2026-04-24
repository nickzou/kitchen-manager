import { Calendar } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { DayPicker } from "react-day-picker";
import "react-day-picker/src/style.css";
import { cn } from "#src/lib/utils";

interface DateRangePickerProps {
	startDate?: string;
	endDate?: string;
	onChange: (start: string, end: string) => void;
	className?: string;
}

function toDateString(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(s: string): Date | undefined {
	if (!s) return undefined;
	return new Date(`${s}T00:00:00`);
}

export function DateRangePicker({
	startDate,
	endDate,
	onChange,
	className,
}: DateRangePickerProps) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const selected: DateRange | undefined =
		startDate || endDate
			? { from: parseDate(startDate ?? ""), to: parseDate(endDate ?? "") }
			: undefined;

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

	function handleSelect(range: DateRange | undefined) {
		if (range?.from && range?.to) {
			onChange(toDateString(range.from), toDateString(range.to));
		} else if (range?.from) {
			onChange(toDateString(range.from), "");
		} else {
			onChange("", "");
		}
	}

	const fromDate = parseDate(startDate ?? "");
	const toDate = parseDate(endDate ?? "");

	const currentYear = new Date().getFullYear();
	const startMonth = new Date(currentYear - 1, 0);
	const endMonth = new Date(currentYear + 10, 11);

	let displayText = "Select date range";
	if (fromDate && toDate) {
		const sameYear = fromDate.getFullYear() === toDate.getFullYear();
		const fromStr = fromDate.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			...(sameYear ? {} : { year: "numeric" }),
		});
		const toStr = toDate.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
		displayText = `${fromStr} – ${toStr}`;
	} else if (fromDate) {
		displayText = fromDate.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className={cn(
					"flex h-10 items-center gap-2 rounded-lg border border-(--line) bg-(--surface) px-3 text-sm outline-none focus:border-(--lagoon) text-left",
					!startDate && !endDate && "text-(--sea-ink-soft)",
					(startDate || endDate) && "text-(--sea-ink)",
					className,
				)}
			>
				<Calendar size={14} className="shrink-0 text-(--sea-ink-soft)" />
				<span className="flex-1">{displayText}</span>
			</button>
			{open && (
				<div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-(--line) bg-white p-2 shadow-lg dark:bg-[#1a2e30]">
					<DayPicker
						mode="range"
						selected={selected}
						onSelect={handleSelect}
						defaultMonth={fromDate}
						numberOfMonths={2}
						captionLayout="dropdown"
						startMonth={startMonth}
						endMonth={endMonth}
						style={
							{
								"--rdp-accent-color": "var(--lagoon)",
								"--rdp-accent-background-color": "rgba(79, 184, 178, 0.14)",
							} as CSSProperties
						}
					/>
				</div>
			)}
		</div>
	);
}
