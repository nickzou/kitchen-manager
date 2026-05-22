import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MealPlanEntry } from "#src/lib/hooks/use-meal-plan-entries";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";

const mockUseRecipeIngredients = vi.fn();
const mockUseProducts = vi.fn();
const mockUseQuantityUnits = vi.fn();

vi.mock("#src/lib/hooks/use-recipe-ingredients", () => ({
	useRecipeIngredients: (...args: unknown[]) =>
		mockUseRecipeIngredients(...args),
}));
vi.mock("#src/lib/hooks/use-products", () => ({
	useProducts: (...args: unknown[]) => mockUseProducts(...args),
}));
vi.mock("#src/lib/hooks/use-quantity-units", () => ({
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
}));

import { MealPlanCookDialog } from "./MealPlanCookDialog";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const entry: MealPlanEntry = {
	id: "mpe-1",
	date: "2026-05-18",
	mealSlotId: "slot-1",
	recipeId: "recipe-1",
	servings: null,
	sortOrder: 0,
	cookedAt: null,
	userId: "u1",
	createdAt: "2026-05-18T00:00:00Z",
	updatedAt: "2026-05-18T00:00:00Z",
	recipeName: "Test Recipe",
	recipeImage: null,
	recipeServings: 4,
};

function ing(
	overrides: Partial<RecipeIngredient> & { id: string },
): RecipeIngredient {
	return {
		recipeId: "recipe-1",
		productId: "p-1",
		quantity: "1",
		quantityUnitId: null,
		notes: null,
		groupName: null,
		optional: false,
		skipStockDeduction: false,
		sortOrder: 0,
		userId: "u1",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("MealPlanCookDialog", () => {
	it("cooks immediately and renders nothing when the recipe has no groups", () => {
		mockUseRecipeIngredients.mockReturnValue({
			data: [ing({ id: "i-1" })],
			isLoading: false,
		});
		mockUseProducts.mockReturnValue({ data: [] });
		mockUseQuantityUnits.mockReturnValue({ data: [] });
		const onCook = vi.fn();
		render(
			<MealPlanCookDialog
				entry={entry}
				isCooking={false}
				onCook={onCook}
				onCancel={vi.fn()}
			/>,
		);
		expect(onCook).toHaveBeenCalledOnce();
		expect(onCook).toHaveBeenCalledWith();
		expect(screen.queryByText("Choose ingredients")).toBeNull();
	});

	it("shows a picker for grouped ingredients and submits selections", () => {
		mockUseRecipeIngredients.mockReturnValue({
			data: [
				ing({
					id: "i-cilantro",
					productId: "p-cilantro",
					groupName: "Toppings",
				}),
				ing({ id: "i-lime", productId: "p-lime", groupName: "Toppings" }),
			],
			isLoading: false,
		});
		mockUseProducts.mockReturnValue({
			data: [
				{ id: "p-cilantro", name: "Cilantro" },
				{ id: "p-lime", name: "Lime" },
			],
		});
		mockUseQuantityUnits.mockReturnValue({ data: [] });
		const onCook = vi.fn();
		render(
			<MealPlanCookDialog
				entry={entry}
				isCooking={false}
				onCook={onCook}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.getByText("Choose ingredients")).toBeDefined();
		expect(onCook).not.toHaveBeenCalled();
		// First alternative is pre-selected; switch to lime.
		fireEvent.click(screen.getByText("Lime"));
		fireEvent.click(screen.getByText("Cook"));
		expect(onCook).toHaveBeenCalledOnce();
		expect(onCook).toHaveBeenCalledWith({ Toppings: "i-lime" });
	});

	it("renders nothing while ingredients are loading", () => {
		mockUseRecipeIngredients.mockReturnValue({
			data: undefined,
			isLoading: true,
		});
		mockUseProducts.mockReturnValue({ data: [] });
		mockUseQuantityUnits.mockReturnValue({ data: [] });
		const onCook = vi.fn();
		const { container } = render(
			<MealPlanCookDialog
				entry={entry}
				isCooking={false}
				onCook={onCook}
				onCancel={vi.fn()}
			/>,
		);
		expect(onCook).not.toHaveBeenCalled();
		expect(container.firstChild).toBeNull();
	});
});
