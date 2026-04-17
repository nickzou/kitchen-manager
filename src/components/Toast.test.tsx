import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function ToastTrigger() {
	const toast = useToast();
	return (
		<>
			<button type="button" onClick={() => toast.success("Item added")}>
				Success
			</button>
			<button type="button" onClick={() => toast.error("Something failed")}>
				Error
			</button>
		</>
	);
}

function renderWithProvider() {
	return render(
		<ToastProvider>
			<ToastTrigger />
		</ToastProvider>,
	);
}

function clickSuccess() {
	act(() => {
		fireEvent.click(screen.getByText("Success"));
	});
}

function clickError() {
	act(() => {
		fireEvent.click(screen.getByText("Error"));
	});
}

describe("Toast", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
	});

	it("renders a success toast with the correct message", () => {
		renderWithProvider();
		clickSuccess();
		expect(screen.getByText("Item added")).toBeDefined();
	});

	it("renders an error toast with the correct message", () => {
		renderWithProvider();
		clickError();
		expect(screen.getByText("Something failed")).toBeDefined();
	});

	it("applies success variant styling", () => {
		renderWithProvider();
		clickSuccess();
		const toast = screen.getByText("Item added").closest("div");
		expect(toast?.className).toContain("border-green-200");
	});

	it("applies error variant styling", () => {
		renderWithProvider();
		clickError();
		const toast = screen.getByText("Something failed").closest("div");
		expect(toast?.className).toContain("border-red-200");
	});

	it("auto-dismisses after 3 seconds", () => {
		renderWithProvider();
		clickSuccess();
		expect(screen.getByText("Item added")).toBeDefined();

		act(() => {
			vi.advanceTimersByTime(3000);
		});

		expect(screen.queryByText("Item added")).toBeNull();
	});

	it("stacks multiple toasts", () => {
		renderWithProvider();
		clickSuccess();
		clickError();

		expect(screen.getByText("Item added")).toBeDefined();
		expect(screen.getByText("Something failed")).toBeDefined();
	});

	it("dismisses toasts independently", () => {
		renderWithProvider();
		clickSuccess();

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		clickError();

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		// First toast should be gone, second still visible
		expect(screen.queryByText("Item added")).toBeNull();
		expect(screen.getByText("Something failed")).toBeDefined();

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		expect(screen.queryByText("Something failed")).toBeNull();
	});
});
