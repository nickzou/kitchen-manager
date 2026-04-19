import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import { IngredientRow, type IngredientRowProps } from "./IngredientRow";

afterEach(() => {
	cleanup();
});

const baseIngredient: RecipeIngredient = {
	id: "ing-1",
	recipeId: "recipe-1",
	productId: "product-1",
	quantity: "100",
	quantityUnitId: "unit-1",
	notes: null,
	groupName: null,
	sortOrder: 0,
	userId: "user-1",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const defaultEditState = {
	productId: "",
	quantity: "",
	quantityUnitId: "",
	notes: "",
	groupName: "",
};

function renderRow(overrides: Partial<IngredientRowProps> = {}) {
	const props: IngredientRowProps = {
		ingredient: baseIngredient,
		productName: "Flour",
		unitLabel: "g",
		scaledQuantity: "100",
		isEditing: false,
		editState: defaultEditState,
		onEditStateChange: vi.fn(),
		isSaving: false,
		onSave: vi.fn(),
		onCancel: vi.fn(),
		onEditProductChange: vi.fn(),
		onCreateProduct: vi.fn(),
		onEdit: vi.fn(),
		onDelete: vi.fn(),
		productOptions: [],
		unitOptions: [],
		...overrides,
	};
	render(<IngredientRow {...props} />);
	return props;
}

function findButton(title: string) {
	return screen.getAllByRole("button").find((b) => b.title === title) as
		| HTMLButtonElement
		| undefined;
}

describe("IngredientRow", () => {
	describe("read-only view", () => {
		it("displays product name and quantity with unit", () => {
			renderRow();
			expect(screen.getByText("Flour")).toBeDefined();
			expect(screen.getByText("100 g")).toBeDefined();
		});

		it("displays quantity without unit when unitLabel is null", () => {
			renderRow({ unitLabel: null, scaledQuantity: "50" });
			expect(screen.getByText("50")).toBeDefined();
		});

		it("displays notes when present", () => {
			renderRow({
				ingredient: { ...baseIngredient, notes: "sifted" },
			});
			expect(screen.getByText("(sifted)")).toBeDefined();
		});

		it("does not display notes when null", () => {
			renderRow();
			expect(screen.queryByText(/\(/)).toBeNull();
		});
	});

	describe("status icons", () => {
		it("shows sufficient status icon", () => {
			renderRow({ status: "sufficient" });
			expect(
				screen.getByText("You have enough stock for this ingredient"),
			).toBeDefined();
		});

		it("shows deficit status icon", () => {
			renderRow({ status: "deficit" });
			expect(
				screen.getByText("Not enough stock for this ingredient"),
			).toBeDefined();
		});

		it("shows unknown status icon", () => {
			renderRow({ status: "unknown" });
			expect(
				screen.getByText(
					"Unable to check stock — no unit conversion available",
				),
			).toBeDefined();
		});

		it("shows no status icon when status is undefined", () => {
			renderRow();
			expect(
				screen.queryByText("You have enough stock for this ingredient"),
			).toBeNull();
			expect(
				screen.queryByText("Not enough stock for this ingredient"),
			).toBeNull();
		});
	});

	describe("edit and delete buttons", () => {
		it("calls onEdit when edit button is clicked", () => {
			const props = renderRow();
			fireEvent.click(findButton("Edit ingredient")!);
			expect(props.onEdit).toHaveBeenCalledOnce();
		});

		it("calls onDelete when delete button is clicked", () => {
			const props = renderRow();
			fireEvent.click(findButton("Delete ingredient")!);
			expect(props.onDelete).toHaveBeenCalledOnce();
		});
	});

	describe("consume button", () => {
		it("is not rendered when onConsume is not provided", () => {
			renderRow();
			expect(findButton("Consume ingredient")).toBeUndefined();
		});

		it("is rendered when onConsume is provided", () => {
			renderRow({ onConsume: vi.fn(), canConsume: true });
			expect(findButton("Consume ingredient")).toBeDefined();
		});

		it("calls onConsume when clicked", () => {
			const onConsume = vi.fn();
			renderRow({ onConsume, canConsume: true });
			fireEvent.click(findButton("Consume ingredient")!);
			expect(onConsume).toHaveBeenCalledOnce();
		});

		it("is disabled when canConsume is false", () => {
			renderRow({ onConsume: vi.fn(), canConsume: false });
			expect(findButton("Consume ingredient")!.disabled).toBe(true);
		});

		it("is disabled when isConsuming is true", () => {
			renderRow({ onConsume: vi.fn(), canConsume: true, isConsuming: true });
			expect(findButton("Consume ingredient")!.disabled).toBe(true);
		});

		it("is enabled when canConsume is true and isConsuming is false", () => {
			renderRow({ onConsume: vi.fn(), canConsume: true, isConsuming: false });
			expect(findButton("Consume ingredient")!.disabled).toBe(false);
		});
	});

	describe("editing view", () => {
		it("shows save and cancel buttons", () => {
			renderRow({ isEditing: true });
			expect(screen.getByText("Save")).toBeDefined();
			expect(screen.getByText("Cancel")).toBeDefined();
		});

		it("calls onSave when save is clicked", () => {
			const props = renderRow({
				isEditing: true,
				editState: { ...defaultEditState, quantity: "200" },
			});
			fireEvent.click(screen.getByText("Save"));
			expect(props.onSave).toHaveBeenCalledOnce();
		});

		it("calls onCancel when cancel is clicked", () => {
			const props = renderRow({ isEditing: true });
			fireEvent.click(screen.getByText("Cancel"));
			expect(props.onCancel).toHaveBeenCalledOnce();
		});

		it("disables save when quantity is empty", () => {
			renderRow({
				isEditing: true,
				editState: { ...defaultEditState, quantity: "" },
			});
			const saveBtn = screen.getByText("Save").closest("button")!;
			expect(saveBtn.disabled).toBe(true);
		});

		it("disables save when isSaving is true", () => {
			renderRow({
				isEditing: true,
				isSaving: true,
				editState: { ...defaultEditState, quantity: "200" },
			});
			expect(screen.getByText("Saving…")).toBeDefined();
			const saveBtn = screen.getByText("Saving…").closest("button")!;
			expect(saveBtn.disabled).toBe(true);
		});

		it("shows conversion hint when provided", () => {
			renderRow({
				isEditing: true,
				conversionHint: "1 cup = 120 g",
			});
			expect(screen.getByText("1 cup = 120 g")).toBeDefined();
		});

		it("does not show conversion hint when not provided", () => {
			renderRow({ isEditing: true });
			expect(screen.queryByText(/conversion/i)).toBeNull();
		});

		it("does not render consume button in editing mode", () => {
			renderRow({
				isEditing: true,
				onConsume: vi.fn(),
				canConsume: true,
			});
			expect(findButton("Consume ingredient")).toBeUndefined();
		});
	});
});
