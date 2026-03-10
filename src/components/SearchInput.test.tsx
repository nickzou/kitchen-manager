import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
	afterEach(cleanup);

	it("renders an input with the search icon", () => {
		render(<SearchInput placeholder="Search..." />);
		expect(screen.getByPlaceholderText("Search...")).toBeDefined();
		expect(document.querySelector("svg")).toBeDefined();
	});

	it("forwards value and onChange props", () => {
		const onChange = vi.fn();
		render(
			<SearchInput placeholder="Search..." value="hello" onChange={onChange} />,
		);
		const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;
		expect(input.value).toBe("hello");
		fireEvent.change(input, { target: { value: "world" } });
		expect(onChange).toHaveBeenCalled();
	});

	it("applies additional className to the input", () => {
		render(<SearchInput placeholder="Search..." className="extra-class" />);
		const input = screen.getByPlaceholderText("Search...");
		expect(input.className).toContain("extra-class");
	});
});
