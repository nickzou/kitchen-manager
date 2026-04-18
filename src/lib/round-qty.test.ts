import { describe, expect, it } from "vitest";
import { roundQty } from "./round-qty";

describe("roundQty", () => {
	it("eliminates floating-point noise from subtraction", () => {
		expect(roundQty(1.0 - 0.7)).toBe(0.3);
	});

	it("eliminates floating-point noise from addition", () => {
		expect(roundQty(0.1 + 0.2)).toBe(0.3);
	});

	it("preserves exact integers", () => {
		expect(roundQty(5)).toBe(5);
	});

	it("preserves values with up to 6 decimal places", () => {
		expect(roundQty(1.123456)).toBe(1.123456);
	});

	it("rounds beyond 6 decimal places", () => {
		expect(roundQty(1.1234567)).toBe(1.123457);
	});

	it("handles zero", () => {
		expect(roundQty(0)).toBe(0);
	});
});
