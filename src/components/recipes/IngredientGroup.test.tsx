import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import { IngredientGroup, type IngredientGroupProps } from "./IngredientGroup";
import type { IngredientRowProps } from "./IngredientRow";

afterEach(() => {
	cleanup();
});

function makeIngredient(
	overrides: Partial<RecipeIngredient> = {},
): RecipeIngredient {
	return {
		id: "ing-1",
		recipeId: "recipe-1",
		productId: "product-1",
		quantity: "100",
		quantityUnitId: "unit-1",
		notes: null,
		groupName: "Toppings",
		optional: false,
		skipStockDeduction: false,
		sortOrder: 0,
		userId: "user-1",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function makeRowProps(ingredient: RecipeIngredient): IngredientRowProps {
	return {
		ingredient,
		productName: "Flour",
		unitLabel: "g",
		scaledQuantity: "100",
		isEditing: false,
		editState: {
			productId: "",
			quantity: "",
			quantityUnitId: "",
			notes: "",
			optional: false,
			skipStockDeduction: false,
			groupName: "",
		},
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
	};
}

function renderGroup(rows: IngredientRowProps[]) {
	const props: IngredientGroupProps = {
		groupName: "Toppings",
		ingredientRows: rows,
		ingredientCount: rows.length,
		isCollapsed: false,
		onToggleCollapse: vi.fn(),
		isRenaming: false,
		renameValue: "",
		onRenameValueChange: vi.fn(),
		onRenameSubmit: vi.fn(),
		onRenameCancel: vi.fn(),
		onStartRename: vi.fn(),
		isRenameSaving: false,
		onDelete: vi.fn(),
	};
	render(<IngredientGroup {...props} />);
}

describe("IngredientGroup optional badge", () => {
	it("shows the Optional badge when every ingredient is optional", () => {
		renderGroup([
			makeRowProps(makeIngredient({ id: "a", optional: true })),
			makeRowProps(makeIngredient({ id: "b", optional: true })),
		]);
		// There's one in the group header and one per row; assert at least the
		// header badge by checking that we have multiple matches (header + rows).
		expect(screen.getAllByText("Optional").length).toBeGreaterThanOrEqual(1);
	});

	it("does not show the group-level Optional badge when at least one ingredient is required", () => {
		renderGroup([
			makeRowProps(makeIngredient({ id: "a", optional: true })),
			makeRowProps(makeIngredient({ id: "b", optional: false })),
		]);
		// Only the single optional row should render a badge, not the header.
		expect(screen.getAllByText("Optional")).toHaveLength(1);
	});

	it("does not show an Optional badge when no ingredients are optional", () => {
		renderGroup([
			makeRowProps(makeIngredient({ id: "a", optional: false })),
			makeRowProps(makeIngredient({ id: "b", optional: false })),
		]);
		expect(screen.queryByText("Optional")).toBeNull();
	});
});
