import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

beforeAll(() => {
	// jsdom doesn't implement scrollIntoView; Combobox calls it on highlight.
	Element.prototype.scrollIntoView = vi.fn();
});

import { Combobox } from "./Combobox";

const options = [
	{ value: "a", label: "Lactantia" },
	{ value: "b", label: "Saputo" },
];

function openWith(query: string, placeholder = "Select…") {
	const input = screen.getByPlaceholderText(placeholder);
	fireEvent.focus(input);
	fireEvent.change(input, { target: { value: query } });
	return input;
}

describe("Combobox", () => {
	afterEach(cleanup);

	it("hides the 'Create new' row when the query exactly matches an existing option", () => {
		const onCreateNew = vi.fn();
		render(
			<Combobox
				value=""
				onChange={vi.fn()}
				options={options}
				onCreateNew={onCreateNew}
			/>,
		);
		openWith("Lactantia");
		expect(screen.queryByText(/Create.*Lactantia/i)).toBeNull();
	});

	it("hides the 'Create new' row case-insensitively", () => {
		const onCreateNew = vi.fn();
		render(
			<Combobox
				value=""
				onChange={vi.fn()}
				options={options}
				onCreateNew={onCreateNew}
			/>,
		);
		openWith("lactantia");
		expect(screen.queryByText(/Create.*lactantia/i)).toBeNull();
	});

	it("trims whitespace before comparing", () => {
		const onCreateNew = vi.fn();
		render(
			<Combobox
				value=""
				onChange={vi.fn()}
				options={options}
				onCreateNew={onCreateNew}
			/>,
		);
		openWith("  Lactantia  ");
		expect(screen.queryByText(/Create.*Lactantia/i)).toBeNull();
	});

	it("still shows the 'Create new' row for non-matching queries", () => {
		const onCreateNew = vi.fn();
		render(
			<Combobox
				value=""
				onChange={vi.fn()}
				options={options}
				onCreateNew={onCreateNew}
			/>,
		);
		openWith("Astro");
		expect(screen.getByText(/Astro/)).toBeDefined();
	});
});
