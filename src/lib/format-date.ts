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
