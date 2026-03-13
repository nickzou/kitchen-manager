import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
	afterEach(cleanup);

	it("renders title and children when open", () => {
		render(
			<Modal open onOpenChange={() => {}} title="Test Title">
				<p>Modal content</p>
			</Modal>,
		);
		expect(screen.getByText("Test Title")).toBeDefined();
		expect(screen.getByText("Modal content")).toBeDefined();
	});

	it("does not render content when closed", () => {
		render(
			<Modal open={false} onOpenChange={() => {}} title="Hidden">
				<p>Should not appear</p>
			</Modal>,
		);
		expect(screen.queryByText("Hidden")).toBeNull();
		expect(screen.queryByText("Should not appear")).toBeNull();
	});

	it("calls onOpenChange when close button is clicked", () => {
		const onOpenChange = vi.fn();
		render(
			<Modal open onOpenChange={onOpenChange} title="Close Me">
				<p>Content</p>
			</Modal>,
		);
		const closeButton = screen.getByRole("button", { name: /close/i });
		fireEvent.click(closeButton);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("renders different children correctly", () => {
		render(
			<Modal open onOpenChange={() => {}} title="Form Modal">
				<input placeholder="Enter value" />
				<button type="button">Submit</button>
			</Modal>,
		);
		expect(screen.getByPlaceholderText("Enter value")).toBeDefined();
		expect(screen.getByRole("button", { name: "Submit" })).toBeDefined();
	});
});
