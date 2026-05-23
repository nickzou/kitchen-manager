import { describe, expect, it } from "vitest";
import { applyExpiryDelta } from "./ExpiryDateEditor";

describe("applyExpiryDelta", () => {
	const today = new Date("2026-05-22T12:00:00");

	it("adds days to a future expiry", () => {
		// May 27 + 1 week → June 3
		expect(
			applyExpiryDelta("2026-05-27", { label: "+1w", days: 7 }, today),
		).toBe("2026-06-03");
	});

	it("anchors from today when no expiry is set", () => {
		expect(applyExpiryDelta(null, { label: "+3d", days: 3 }, today)).toBe(
			"2026-05-25",
		);
	});

	it("anchors from today when expiry is in the past", () => {
		// Expired Jan 1 — +1 week should be from today (May 22), not Jan
		expect(
			applyExpiryDelta("2026-01-01", { label: "+1w", days: 7 }, today),
		).toBe("2026-05-29");
	});

	it("adds months", () => {
		// May 27 + 1 month → June 27
		expect(
			applyExpiryDelta("2026-05-27", { label: "+1mo", months: 1 }, today),
		).toBe("2026-06-27");
	});

	it("rolls over month boundaries when adding days", () => {
		// May 27 + 1 week → June 3 (covered above), but also May 30 + 3d → June 2
		expect(
			applyExpiryDelta("2026-05-30", { label: "+3d", days: 3 }, today),
		).toBe("2026-06-02");
	});

	it("handles a tomorrow-expiry +1 day", () => {
		// Tomorrow (May 23) + 1 day → May 24
		expect(
			applyExpiryDelta("2026-05-23", { label: "+1d", days: 1 }, today),
		).toBe("2026-05-24");
	});
});
