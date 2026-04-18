import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { StockActions } from "./StockActions";

afterEach(() => {
	cleanup();
});

function findButton(title: string) {
	return screen.getAllByRole("button").find((b) => b.title === title) as
		| HTMLButtonElement
		| undefined;
}

function findConsumeButton() {
	return screen
		.getAllByRole("button")
		.find(
			(b) =>
				b.textContent?.includes("Consume") && !b.textContent?.includes("All"),
		) as HTMLButtonElement | undefined;
}

function renderActions(
	overrides: Partial<Parameters<typeof StockActions>[0]> = {},
) {
	const props = {
		quantity: "10",
		consumeAmount: "",
		onConsumeAmountChange: vi.fn(),
		onConsume: vi.fn(),
		onConsumeAll: vi.fn(),
		consumePending: false,
		onSpoil: vi.fn(),
		onSpoilAll: vi.fn(),
		spoilPending: false,
		...overrides,
	};
	render(<StockActions {...props} />);
	return props;
}

describe("StockActions", () => {
	describe("quantity input", () => {
		it("renders a number input with placeholder", () => {
			renderActions();
			expect(screen.getByPlaceholderText("Qty")).toBeDefined();
		});

		it("calls onConsumeAmountChange when input changes", () => {
			const props = renderActions();
			fireEvent.change(screen.getByPlaceholderText("Qty"), {
				target: { value: "5" },
			});
			expect(props.onConsumeAmountChange).toHaveBeenCalledWith("5");
		});

		it("displays the current consumeAmount value", () => {
			renderActions({ consumeAmount: "3" });
			expect(screen.getByPlaceholderText("Qty")).toHaveProperty("value", "3");
		});
	});

	describe("spoil button", () => {
		it("is disabled when consumeAmount is empty", () => {
			renderActions({ consumeAmount: "" });
			const btn = findButton("Mark amount as spoiled");
			expect(btn).toBeDefined();
			expect(btn!.disabled).toBe(true);
		});

		it("is enabled when consumeAmount is set", () => {
			renderActions({ consumeAmount: "2" });
			expect(findButton("Mark amount as spoiled")!.disabled).toBe(false);
		});

		it("calls onSpoil when clicked", () => {
			const props = renderActions({ consumeAmount: "2" });
			fireEvent.click(findButton("Mark amount as spoiled")!);
			expect(props.onSpoil).toHaveBeenCalledOnce();
		});

		it("is disabled when spoilPending is true", () => {
			renderActions({ consumeAmount: "2", spoilPending: true });
			expect(findButton("Mark amount as spoiled")!.disabled).toBe(true);
		});
	});

	describe("spoil all button", () => {
		it("is enabled when quantity > 0", () => {
			renderActions({ quantity: "10" });
			expect(findButton("Mark all as spoiled")!.disabled).toBe(false);
		});

		it("is disabled when quantity is 0", () => {
			renderActions({ quantity: "0" });
			expect(findButton("Mark all as spoiled")!.disabled).toBe(true);
		});

		it("calls onSpoilAll when clicked", () => {
			const props = renderActions({ quantity: "10" });
			fireEvent.click(findButton("Mark all as spoiled")!);
			expect(props.onSpoilAll).toHaveBeenCalledOnce();
		});
	});

	describe("consume button", () => {
		it("is disabled when consumeAmount is empty", () => {
			renderActions({ consumeAmount: "" });
			expect(findConsumeButton()!.disabled).toBe(true);
		});

		it("is enabled when consumeAmount is set", () => {
			renderActions({ consumeAmount: "3" });
			expect(findConsumeButton()!.disabled).toBe(false);
		});

		it("calls onConsume when clicked", () => {
			const props = renderActions({ consumeAmount: "3" });
			fireEvent.click(findConsumeButton()!);
			expect(props.onConsume).toHaveBeenCalledOnce();
		});

		it("is disabled when consumePending is true", () => {
			renderActions({ consumeAmount: "3", consumePending: true });
			expect(findConsumeButton()!.disabled).toBe(true);
		});
	});

	describe("consume all button", () => {
		it("is enabled when quantity > 0", () => {
			renderActions({ quantity: "10" });
			expect(findButton("Consume all remaining stock")!.disabled).toBe(false);
		});

		it("is disabled when quantity is 0", () => {
			renderActions({ quantity: "0" });
			expect(findButton("Consume all remaining stock")!.disabled).toBe(true);
		});

		it("calls onConsumeAll when clicked", () => {
			const props = renderActions({ quantity: "10" });
			fireEvent.click(findButton("Consume all remaining stock")!);
			expect(props.onConsumeAll).toHaveBeenCalledOnce();
		});
	});
});
