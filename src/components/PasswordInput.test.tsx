import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
	afterEach(cleanup);

	it("renders a label and input", () => {
		render(<PasswordInput label="Password" value="" onChange={() => {}} />);
		expect(screen.getByLabelText("Password")).toBeDefined();
	});

	it("displays masked value with last character visible", () => {
		render(
			<PasswordInput label="Password" value="hello" onChange={() => {}} />,
		);
		const input = screen.getByLabelText("Password") as HTMLInputElement;
		expect(input.value).toBe("••••o");
	});

	it("displays empty string when value is empty", () => {
		render(<PasswordInput label="Password" value="" onChange={() => {}} />);
		const input = screen.getByLabelText("Password") as HTMLInputElement;
		expect(input.value).toBe("");
	});

	it("displays single character unmasked", () => {
		render(<PasswordInput label="Password" value="a" onChange={() => {}} />);
		const input = screen.getByLabelText("Password") as HTMLInputElement;
		expect(input.value).toBe("a");
	});

	it("reveals full value when toggle is clicked", () => {
		render(
			<PasswordInput label="Password" value="secret" onChange={() => {}} />,
		);
		const input = screen.getByLabelText("Password") as HTMLInputElement;
		expect(input.value).toBe("•••••t");

		const toggle = screen.getByRole("button");
		fireEvent.click(toggle);

		expect(input.value).toBe("secret");
	});

	it("re-masks when toggle is clicked twice", () => {
		render(
			<PasswordInput label="Password" value="secret" onChange={() => {}} />,
		);
		const toggle = screen.getByRole("button");
		fireEvent.click(toggle);
		fireEvent.click(toggle);

		const input = screen.getByLabelText("Password") as HTMLInputElement;
		expect(input.value).toBe("•••••t");
	});

	it("translates appended character to real value", () => {
		const onChange = vi.fn();
		render(<PasswordInput label="Password" value="abc" onChange={onChange} />);
		const input = screen.getByLabelText("Password") as HTMLInputElement;

		// Simulate typing "d" at the end: masked "••cd" -> real "abcd"
		fireEvent.change(input, {
			target: { value: "••cd", selectionStart: 4 },
		});

		expect(onChange).toHaveBeenCalledTimes(1);
		const event = onChange.mock.calls[0][0];
		expect(event.target.value).toBe("abcd");
	});

	it("translates deleted character to real value", () => {
		const onChange = vi.fn();
		render(<PasswordInput label="Password" value="abcd" onChange={onChange} />);
		const input = screen.getByLabelText("Password") as HTMLInputElement;

		// Simulate deleting last char: "•••d" -> "••c" (real "abc")
		fireEvent.change(input, {
			target: { value: "••c", selectionStart: 3 },
		});

		expect(onChange).toHaveBeenCalledTimes(1);
		const event = onChange.mock.calls[0][0];
		expect(event.target.value).toBe("abc");
	});

	it("passes through real value in revealed mode", () => {
		const onChange = vi.fn();
		render(<PasswordInput label="Password" value="abc" onChange={onChange} />);

		fireEvent.click(screen.getByRole("button"));

		const input = screen.getByLabelText("Password") as HTMLInputElement;
		fireEvent.change(input, {
			target: { value: "abcd", selectionStart: 4 },
		});

		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("forwards required and minLength props", () => {
		render(
			<PasswordInput
				label="Password"
				value=""
				onChange={() => {}}
				required
				minLength={8}
			/>,
		);
		const input = screen.getByLabelText("Password") as HTMLInputElement;
		expect(input.required).toBe(true);
		expect(input.minLength).toBe(8);
	});
});
