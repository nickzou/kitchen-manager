export function formatDate(dateStr: string | null) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString();
}

/**
 * Snap `d` back to the most recent occurrence of `startDay` (0=Sun, 1=Mon, …, 6=Sat).
 * If `d` already lands on `startDay`, returns the same date. Time set to 00:00.
 * Returns a fresh Date — does not mutate the input.
 */
export function getWeekStart(d: Date, startDay: number): Date {
	const date = new Date(d);
	const day = date.getDay();
	const diff = (day - startDay + 7) % 7;
	date.setDate(date.getDate() - diff);
	date.setHours(0, 0, 0, 0);
	return date;
}

function ymd(d: Date) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Return YYYY-MM-DD strings for today and the end of the current week,
 * where "end of week" is `getWeekStart(today, weekStartDay) + 6 days`.
 * `today` defaults to `new Date()` but is parameterised so tests can pin it.
 */
export function todayToWeekEnd(
	weekStartDay: number,
	today: Date = new Date(),
): { start: string; end: string } {
	const t = new Date(today);
	t.setHours(0, 0, 0, 0);
	const end = getWeekStart(t, weekStartDay);
	end.setDate(end.getDate() + 6);
	return { start: ymd(t), end: ymd(end) };
}
