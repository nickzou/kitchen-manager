import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductUnitConversion } from "#src/lib/hooks/use-product-unit-conversions";
import type { Product } from "#src/lib/hooks/use-products";
import type { QuantityUnit } from "#src/lib/hooks/use-quantity-units";
import type { RecipeIngredient } from "#src/lib/hooks/use-recipe-ingredients";
import type { UnitConversion } from "#src/lib/hooks/use-unit-conversions";
import { CookAdjustModal } from "./CookAdjustModal";

afterEach(() => cleanup());

const gUnit: QuantityUnit = {
	id: "u-g",
	name: "gram",
	abbreviation: "g",
	userId: "u",
	createdAt: "",
	updatedAt: "",
};
const cupUnit: QuantityUnit = {
	id: "u-cup",
	name: "cup",
	abbreviation: "cup",
	userId: "u",
	createdAt: "",
	updatedAt: "",
};

const rice: Product = {
	id: "p-rice",
	name: "Rice",
	categoryIds: [],
	description: null,
	image: null,
	defaultQuantityUnitId: "u-g",
	minStockAmount: "0",
	isFood: true,
	defaultExpirationDays: null,
	defaultConsumeAmount: null,
	defaultConsumeUnitId: null,
	calories: null,
	protein: null,
	fat: null,
	carbs: null,
	nutritionBaseAmount: "100",
	nutritionBaseUnitId: null,
	defaultTareWeight: null,
	defaultSkipStockDeduction: false,
	pinned: false,
	pinnedSortOrder: null,
	userId: "u",
	createdAt: "",
	updatedAt: "",
};

const cilantro: Product = { ...rice, id: "p-cil", name: "Cilantro" };
const lime: Product = { ...rice, id: "p-lime", name: "Lime" };
const salt: Product = { ...rice, id: "p-salt", name: "Salt" };

function ing(
	overrides: Partial<RecipeIngredient> & { id: string },
): RecipeIngredient {
	return {
		recipeId: "r-1",
		productId: "p-rice",
		quantity: "100",
		quantityUnitId: "u-g",
		notes: null,
		groupName: null,
		optional: false,
		skipStockDeduction: false,
		sortOrder: 0,
		userId: "u",
		createdAt: "",
		updatedAt: "",
		...overrides,
	};
}

const cupToGramConversion: UnitConversion = {
	id: "c-1",
	fromUnitId: "u-cup",
	toUnitId: "u-g",
	factor: "240",
	userId: "u",
	createdAt: "",
	updatedAt: "",
} as unknown as UnitConversion;

const noProductConversions: ProductUnitConversion[] = [];

describe("CookAdjustModal", () => {
	it("Cook with no edits sends empty overrides and skips", () => {
		const onCook = vi.fn();
		render(
			<CookAdjustModal
				open
				recipeName="Rice"
				ingredients={[ing({ id: "i-1" })]}
				products={[rice]}
				quantityUnits={[gUnit]}
				unitConversions={[]}
				productConversions={noProductConversions}
				scaleFactor={1}
				isCooking={false}
				onCancel={vi.fn()}
				onCook={onCook}
				onCookAsIs={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("Cook"));
		expect(onCook).toHaveBeenCalledWith({
			ingredientOverrides: {},
			skippedIngredients: [],
			groupSelections: {},
		});
	});

	it("includes an override when the quantity is edited", () => {
		const onCook = vi.fn();
		render(
			<CookAdjustModal
				open
				recipeName="Rice"
				ingredients={[ing({ id: "i-1" })]}
				products={[rice]}
				quantityUnits={[gUnit]}
				unitConversions={[]}
				productConversions={noProductConversions}
				scaleFactor={1}
				isCooking={false}
				onCancel={vi.fn()}
				onCook={onCook}
				onCookAsIs={vi.fn()}
			/>,
		);
		const input = screen.getByLabelText(
			"Quantity for Rice",
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "120" } });
		fireEvent.click(screen.getByText("Cook"));
		expect(onCook).toHaveBeenCalledWith({
			ingredientOverrides: {
				"i-1": { quantity: "120", quantityUnitId: "u-g" },
			},
			skippedIngredients: [],
			groupSelections: {},
		});
	});

	it("scaleFactor is applied to the initial displayed quantity", () => {
		render(
			<CookAdjustModal
				open
				recipeName="Rice"
				ingredients={[ing({ id: "i-1", quantity: "100" })]}
				products={[rice]}
				quantityUnits={[gUnit]}
				unitConversions={[]}
				productConversions={noProductConversions}
				scaleFactor={2}
				isCooking={false}
				onCancel={vi.fn()}
				onCook={vi.fn()}
				onCookAsIs={vi.fn()}
			/>,
		);
		const input = screen.getByLabelText(
			"Quantity for Rice",
		) as HTMLInputElement;
		expect(input.value).toBe("200");
	});

	it("changing the unit converts the displayed quantity but submits in the recipe unit", () => {
		const onCook = vi.fn();
		render(
			<CookAdjustModal
				open
				recipeName="Rice"
				ingredients={[
					ing({ id: "i-1", quantity: "240", quantityUnitId: "u-g" }),
				]}
				products={[rice]}
				quantityUnits={[gUnit, cupUnit]}
				unitConversions={[cupToGramConversion]}
				productConversions={noProductConversions}
				scaleFactor={1}
				isCooking={false}
				onCancel={vi.fn()}
				onCook={onCook}
				onCookAsIs={vi.fn()}
			/>,
		);
		const unitSelect = screen.getByLabelText(
			"Unit for Rice",
		) as HTMLSelectElement;
		fireEvent.change(unitSelect, { target: { value: "u-cup" } });
		const qtyInput = screen.getByLabelText(
			"Quantity for Rice",
		) as HTMLInputElement;
		// 240g / 240 = 1 cup
		expect(qtyInput.value).toBe("1");

		// User adjusts to 1.5 cups
		fireEvent.change(qtyInput, { target: { value: "1.5" } });
		fireEvent.click(screen.getByText("Cook"));

		// Override is sent in the recipe's original unit (g): 1.5 * 240 = 360
		expect(onCook).toHaveBeenCalledWith({
			ingredientOverrides: {
				"i-1": { quantity: "360", quantityUnitId: "u-g" },
			},
			skippedIngredients: [],
			groupSelections: {},
		});
	});

	it("unchecking an optional ingredient adds it to skippedIngredients", () => {
		const onCook = vi.fn();
		render(
			<CookAdjustModal
				open
				recipeName="Rice"
				ingredients={[
					ing({ id: "i-rice" }),
					ing({ id: "i-salt", productId: "p-salt", optional: true }),
				]}
				products={[rice, salt]}
				quantityUnits={[gUnit]}
				unitConversions={[]}
				productConversions={noProductConversions}
				scaleFactor={1}
				isCooking={false}
				onCancel={vi.fn()}
				onCook={onCook}
				onCookAsIs={vi.fn()}
			/>,
		);
		const useToggle = screen.getByLabelText(
			"Use this time",
		) as HTMLInputElement;
		fireEvent.click(useToggle);
		fireEvent.click(screen.getByText("Cook"));
		expect(onCook).toHaveBeenCalledWith({
			ingredientOverrides: {},
			skippedIngredients: ["i-salt"],
			groupSelections: {},
		});
	});

	it("groups default to first ingredient and respect radio switching", () => {
		const onCook = vi.fn();
		render(
			<CookAdjustModal
				open
				recipeName="Tacos"
				ingredients={[
					ing({
						id: "i-cil",
						productId: "p-cil",
						groupName: "Toppings",
					}),
					ing({ id: "i-lime", productId: "p-lime", groupName: "Toppings" }),
				]}
				products={[cilantro, lime]}
				quantityUnits={[gUnit]}
				unitConversions={[]}
				productConversions={noProductConversions}
				scaleFactor={1}
				isCooking={false}
				onCancel={vi.fn()}
				onCook={onCook}
				onCookAsIs={vi.fn()}
			/>,
		);
		const radios = screen.getAllByRole("radio");
		fireEvent.click(radios[1]);
		fireEvent.click(screen.getByText("Cook"));
		expect(onCook).toHaveBeenCalledWith({
			ingredientOverrides: {},
			skippedIngredients: [],
			groupSelections: { Toppings: "i-lime" },
		});
	});

	it("Cook as-is delegates to onCookAsIs with only group selections", () => {
		const onCookAsIs = vi.fn();
		render(
			<CookAdjustModal
				open
				recipeName="Rice"
				ingredients={[ing({ id: "i-1" })]}
				products={[rice]}
				quantityUnits={[gUnit]}
				unitConversions={[]}
				productConversions={noProductConversions}
				scaleFactor={1}
				isCooking={false}
				onCancel={vi.fn()}
				onCook={vi.fn()}
				onCookAsIs={onCookAsIs}
			/>,
		);
		// Edit the quantity – Cook as-is should ignore the edit.
		const input = screen.getByLabelText(
			"Quantity for Rice",
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "9999" } });
		fireEvent.click(screen.getByText("Cook as-is"));
		expect(onCookAsIs).toHaveBeenCalledWith({ groupSelections: {} });
	});
});
