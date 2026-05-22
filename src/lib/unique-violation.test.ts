import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./unique-violation";

describe("isUniqueViolation", () => {
	it("returns true for an Error with code 23505", () => {
		const err = Object.assign(new Error("dup"), { code: "23505" });
		expect(isUniqueViolation(err)).toBe(true);
	});

	it("returns false for an Error with a different code", () => {
		const err = Object.assign(new Error("oops"), { code: "23503" });
		expect(isUniqueViolation(err)).toBe(false);
	});

	it("returns false for an Error with no code property", () => {
		expect(isUniqueViolation(new Error("no code"))).toBe(false);
	});

	it("returns false for non-Error values", () => {
		expect(isUniqueViolation(null)).toBe(false);
		expect(isUniqueViolation(undefined)).toBe(false);
		expect(isUniqueViolation("23505")).toBe(false);
		expect(isUniqueViolation({ code: "23505" })).toBe(false);
	});
});
