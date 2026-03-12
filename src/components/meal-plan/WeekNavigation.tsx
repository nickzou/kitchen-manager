import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekNavigationProps {
	weekStart: Date;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	onToday: () => void;
}

function formatWeekLabel(start: Date): string {
	const end = new Date(start);
	end.setDate(end.getDate() + 6);

	const startMonth = start.toLocaleDateString("en-US", { month: "short" });
	const endMonth = end.toLocaleDateString("en-US", { month: "short" });
	const startDay = start.getDate();
	const endDay = end.getDate();
	const year = start.getFullYear();

	if (startMonth === endMonth) {
		return `${startMonth} ${startDay}–${endDay}, ${year}`;
	}
	return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

export function WeekNavigation({
	weekStart,
	onPrevWeek,
	onNextWeek,
	onToday,
}: WeekNavigationProps) {
	return (
		<div className="flex items-center gap-3">
			<button
				type="button"
				onClick={onPrevWeek}
				className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
			>
				<ChevronLeft size={16} />
			</button>
			<button
				type="button"
				onClick={onNextWeek}
				className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--line) text-(--sea-ink-soft) transition hover:bg-(--surface)"
			>
				<ChevronRight size={16} />
			</button>
			<button
				type="button"
				onClick={onToday}
				className="rounded-lg border border-(--line) px-3 py-1 text-xs font-semibold text-(--sea-ink-soft) transition hover:bg-(--surface)"
			>
				Today
			</button>
			<span className="text-sm font-semibold text-(--sea-ink)">
				{formatWeekLabel(weekStart)}
			</span>
		</div>
	);
}
