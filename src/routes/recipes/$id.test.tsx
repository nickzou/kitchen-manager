import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "#src/lib/hooks/use-recipes";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseRecipe = vi.fn();
const mockUseUpdateRecipe = vi.fn();
const mockUseDeleteRecipe = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: ComponentType }) => ({
		component: opts.component,
		useParams: () => ({ id: "1" }),
	}),
	useNavigate: () => mockNavigate,
	Link: ({ children, to, ...props }: Record<string, unknown>) => (
		<a href={to as string} {...props}>
			{children as ReactNode}
		</a>
	),
}));

vi.mock("#src/lib/auth-client", () => ({
	authClient: { useSession: (...args: unknown[]) => mockUseSession(...args) },
}));

vi.mock("#src/lib/hooks/use-recipes", () => ({
	useRecipe: (...args: unknown[]) => mockUseRecipe(...args),
	useUpdateRecipe: (...args: unknown[]) => mockUseUpdateRecipe(...args),
	useDeleteRecipe: (...args: unknown[]) => mockUseDeleteRecipe(...args),
}));

const mockUseCategories = vi.fn();
vi.mock("#src/lib/hooks/use-categories", () => ({
	useCategories: (...args: unknown[]) => mockUseCategories(...args),
}));

const mockUseProducts = vi.fn();
const mockUseCreateProduct = vi.fn();
vi.mock("#src/lib/hooks/use-products", () => ({
	useProducts: (...args: unknown[]) => mockUseProducts(...args),
	useCreateProduct: (...args: unknown[]) => mockUseCreateProduct(...args),
}));

const mockUseQuantityUnits = vi.fn();
vi.mock("#src/lib/hooks/use-quantity-units", () => ({
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
}));

const mockUseRecipeIngredients = vi.fn();
const mockUseCreateRecipeIngredient = vi.fn();
const mockUseUpdateRecipeIngredient = vi.fn();
const mockUseDeleteRecipeIngredient = vi.fn();
vi.mock("#src/lib/hooks/use-recipe-ingredients", () => ({
	useRecipeIngredients: (...args: unknown[]) =>
		mockUseRecipeIngredients(...args),
	useCreateRecipeIngredient: (...args: unknown[]) =>
		mockUseCreateRecipeIngredient(...args),
	useUpdateRecipeIngredient: (...args: unknown[]) =>
		mockUseUpdateRecipeIngredient(...args),
	useDeleteRecipeIngredient: (...args: unknown[]) =>
		mockUseDeleteRecipeIngredient(...args),
}));

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { Route } from "./$id";

const mockRecipe: Recipe = {
	id: "1",
	name: "Pasta Bolognese",
	description: "Classic Italian pasta",
	image: null,
	servings: 4,
	prepTime: 15,
	cookTime: 45,
	instructions: "Cook pasta. Make sauce.",
	categoryId: "c1",
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-02T00:00:00Z",
};

const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteMutateAsync = vi.fn().mockResolvedValue({});
const mockCreateIngredientMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteIngredientMutateAsync = vi.fn().mockResolvedValue({});

beforeEach(() => {
	vi.clearAllMocks();

	mockUseSession.mockReturnValue({
		data: { user: { id: "u1" }, session: { id: "s1" } },
		isPending: false,
	});
	mockUseRecipe.mockReturnValue({
		data: mockRecipe,
		isLoading: false,
		error: null,
	});
	mockUseUpdateRecipe.mockReturnValue({
		mutateAsync: mockUpdateMutateAsync,
		isPending: false,
	});
	mockUseDeleteRecipe.mockReturnValue({
		mutateAsync: mockDeleteMutateAsync,
		isPending: false,
	});
	mockUseCategories.mockReturnValue({
		data: [{ id: "c1", name: "Italian" }],
	});
	mockUseProducts.mockReturnValue({
		data: [{ id: "p1", name: "Spaghetti" }],
	});
	mockUseCreateProduct.mockReturnValue({
		mutateAsync: vi.fn(),
		isPending: false,
	});
	mockUseQuantityUnits.mockReturnValue({
		data: [{ id: "qu1", name: "Grams", abbreviation: "g" }],
	});
	mockUseRecipeIngredients.mockReturnValue({
		data: [
			{
				id: "ri1",
				recipeId: "1",
				productId: "p1",
				quantity: "500",
				quantityUnitId: "qu1",
				notes: null,
				sortOrder: 0,
				userId: "u1",
				createdAt: "2026-03-01T00:00:00Z",
				updatedAt: "2026-03-01T00:00:00Z",
			},
		],
	});
	mockUseCreateRecipeIngredient.mockReturnValue({
		mutateAsync: mockCreateIngredientMutateAsync,
		isPending: false,
	});
	mockUseUpdateRecipeIngredient.mockReturnValue({
		mutateAsync: vi.fn().mockResolvedValue({}),
		isPending: false,
	});
	mockUseDeleteRecipeIngredient.mockReturnValue({
		mutateAsync: mockDeleteIngredientMutateAsync,
		isPending: false,
	});
});

afterEach(() => {
	cleanup();
});

function renderPage() {
	const Component = (Route as unknown as { component: ComponentType })
		.component;
	const Wrapper = createTestWrapper();
	return render(<Component />, { wrapper: Wrapper });
}

describe("RecipeDetail", () => {
	describe("authentication", () => {
		it("redirects to /sign-in when session is null", () => {
			mockUseSession.mockReturnValue({ data: null, isPending: false });

			renderPage();

			expect(mockNavigate).toHaveBeenCalledWith({ to: "/sign-in" });
		});
	});

	describe("error states", () => {
		it("shows 'Recipe not found' on error", () => {
			mockUseRecipe.mockReturnValue({
				data: null,
				isLoading: false,
				error: new Error("Not found"),
			});

			renderPage();

			expect(screen.getByText("Recipe not found")).toBeDefined();
		});
	});

	describe("view mode", () => {
		it("displays recipe details", () => {
			renderPage();

			expect(screen.getByText("Pasta Bolognese")).toBeDefined();
			expect(screen.getByText("Italian")).toBeDefined();
			expect(screen.getByText("Classic Italian pasta")).toBeDefined();
			expect(screen.getByText("Cook pasta. Make sauce.")).toBeDefined();
		});

		it("displays ingredients", () => {
			renderPage();

			expect(screen.getByText("Spaghetti")).toBeDefined();
			expect(screen.getByText("Ingredients")).toBeDefined();
		});
	});

	describe("edit flow", () => {
		it("shows edit form and saves changes", async () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Edit"));

			expect(screen.getByText("Edit recipe")).toBeDefined();

			const nameInput = screen.getByDisplayValue("Pasta Bolognese");
			fireEvent.change(nameInput, { target: { value: "Penne Bolognese" } });

			fireEvent.click(screen.getByText("Save changes"));

			await waitFor(() => {
				expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
					name: "Penne Bolognese",
					description: "Classic Italian pasta",
					categoryId: "c1",
					servings: 4,
					prepTime: 15,
					cookTime: 45,
					instructions: "Cook pasta. Make sauce.",
				});
			});
		});
	});

	describe("delete flow", () => {
		it("shows confirmation and cancels", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Delete"));

			expect(
				screen.getByText("Delete this recipe? This cannot be undone."),
			).toBeDefined();

			fireEvent.click(screen.getByText("Cancel"));

			expect(
				screen.queryByText("Delete this recipe? This cannot be undone."),
			).toBeNull();
		});

		it("confirms delete and navigates", async () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Delete"));

			const buttons = screen.getAllByText("Delete");
			const confirmButton = buttons.find((b) =>
				b.className.includes("bg-red-600"),
			) as HTMLElement;
			fireEvent.click(confirmButton);

			await waitFor(() => {
				expect(mockDeleteMutateAsync).toHaveBeenCalledWith("1");
			});

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({ to: "/recipes" });
			});
		});
	});

	describe("ingredients", () => {
		it("shows ingredient with product name and quantity", () => {
			renderPage();

			expect(screen.getByText("Spaghetti")).toBeDefined();
			expect(screen.getByText(/500/)).toBeDefined();
		});

		it("shows empty state when no ingredients", () => {
			mockUseRecipeIngredients.mockReturnValue({ data: [] });

			renderPage();

			expect(screen.getByText("No ingredients yet.")).toBeDefined();
		});
	});
});
