import { describe, expect, it } from "vitest";
import { getWeekStart } from "./format-date";

function ymd(d: Date) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("getWeekStart", () => {
	// 2026-05-06 is a Wednesday (day = 3).
	const wed = new Date("2026-05-06T12:34:56");

	it("returns the most recent Monday when startDay=1 and date is mid-week", () => {
		const r = getWeekStart(wed, 1);
		expect(ymd(r)).toBe("2026-05-04");
	});

	it("returns the most recent Sunday when startDay=0 and date is mid-week", () => {
		const r = getWeekStart(wed, 0);
		expect(ymd(r)).toBe("2026-05-03");
	});

	it("returns the same date when it already lands on startDay", () => {
		// 2026-05-04 is a Monday.
		const monday = new Date("2026-05-04T08:00:00");
		const r = getWeekStart(monday, 1);
		expect(ymd(r)).toBe("2026-05-04");
	});

	it("crosses the Sunday→Saturday boundary correctly", () => {
		// 2026-05-03 is Sunday; with Monday-start week, the most recent Monday is
		// 2026-04-27 (six days back), not the upcoming Monday.
		const sunday = new Date("2026-05-03T18:00:00");
		const r = getWeekStart(sunday, 1);
		expect(ymd(r)).toBe("2026-04-27");
	});

	it("zeroes the time component", () => {
		const r = getWeekStart(wed, 1);
		expect(r.getHours()).toBe(0);
		expect(r.getMinutes()).toBe(0);
		expect(r.getSeconds()).toBe(0);
		expect(r.getMilliseconds()).toBe(0);
	});

	it("does not mutate the input date", () => {
		const original = new Date("2026-05-06T12:34:56");
		const beforeIso = original.toISOString();
		getWeekStart(original, 1);
		expect(original.toISOString()).toBe(beforeIso);
	});

	it("handles every startDay 0–6 without throwing", () => {
		for (let s = 0; s < 7; s++) {
			const r = getWeekStart(wed, s);
			expect(r.getDay()).toBe(s);
			expect(r.getTime()).toBeLessThanOrEqual(wed.getTime());
		}
	});
});
