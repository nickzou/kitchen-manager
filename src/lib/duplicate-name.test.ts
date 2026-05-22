import { describe, expect, it } from "vitest";
import { findDuplicateName } from "./duplicate-name";

const items = [
	{ id: "a", name: "Lactantia" },
	{ id: "b", name: "Saputo" },
	{ id: "c", name: "Beatrice" },
];

describe("findDuplicateName", () => {
	it("returns undefined for empty input", () => {
		expect(findDuplicateName("", items)).toBeUndefined();
		expect(findDuplicateName("   ", items)).toBeUndefined();
	});

	it("returns undefined when there's no match", () => {
		expect(findDuplicateName("Astro", items)).toBeUndefined();
	});

	it("returns the matching row for an exact match", () => {
		expect(findDuplicateName("Lactantia", items)?.id).toBe("a");
	});

	it("matches case-insensitively", () => {
		expect(findDuplicateName("lactantia", items)?.id).toBe("a");
		expect(findDuplicateName("LACTANTIA", items)?.id).toBe("a");
	});

	it("trims whitespace before comparing", () => {
		expect(findDuplicateName("  Saputo  ", items)?.id).toBe("b");
	});

	it("skips the excluded id (edit flow)", () => {
		expect(findDuplicateName("Lactantia", items, "a")).toBeUndefined();
		expect(findDuplicateName("Saputo", items, "a")?.id).toBe("b");
	});

	it("handles undefined existing list gracefully", () => {
		expect(findDuplicateName("anything", undefined)).toBeUndefined();
	});
});
