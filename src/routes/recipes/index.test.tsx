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
const mockUseRecipes = vi.fn();
const mockUseCreateRecipe = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: ComponentType }) => ({
		component: opts.component,
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
	useRecipes: (...args: unknown[]) => mockUseRecipes(...args),
	useCreateRecipe: (...args: unknown[]) => mockUseCreateRecipe(...args),
}));

const mockUseCategories = vi.fn();
vi.mock("#src/lib/hooks/use-categories", () => ({
	useCategories: (...args: unknown[]) => mockUseCategories(...args),
}));

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { Route } from "./index";

const mockRecipe: Recipe = {
	id: "1",
	name: "Pasta Bolognese",
	description: null,
	servings: 4,
	prepTime: 15,
	cookTime: 45,
	instructions: null,
	categoryId: "c1",
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-01T00:00:00Z",
};

const mockMutateAsync = vi.fn().mockResolvedValue({});

beforeEach(() => {
	vi.clearAllMocks();

	mockUseSession.mockReturnValue({
		data: { user: { id: "u1" }, session: { id: "s1" } },
		isPending: false,
	});
	mockUseRecipes.mockReturnValue({
		data: [mockRecipe],
		isLoading: false,
	});
	mockUseCreateRecipe.mockReturnValue({
		mutateAsync: mockMutateAsync,
		isPending: false,
	});
	mockUseCategories.mockReturnValue({
		data: [{ id: "c1", name: "Italian" }],
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

describe("RecipesPage", () => {
	describe("authentication", () => {
		it("redirects to /sign-in when session is null", () => {
			mockUseSession.mockReturnValue({ data: null, isPending: false });

			renderPage();

			expect(mockNavigate).toHaveBeenCalledWith({ to: "/sign-in" });
		});

		it("returns null when session is loading", () => {
			mockUseSession.mockReturnValue({ data: null, isPending: true });

			const { container } = renderPage();

			expect(container.innerHTML).toBe("");
		});
	});

	describe("loading and empty states", () => {
		it("shows loading state when recipes are loading", () => {
			mockUseRecipes.mockReturnValue({
				data: undefined,
				isLoading: true,
			});

			renderPage();

			expect(screen.getByText("Loading…")).toBeDefined();
		});

		it("shows empty state when no recipes", () => {
			mockUseRecipes.mockReturnValue({
				data: [],
				isLoading: false,
			});

			renderPage();

			expect(screen.getByText("No recipes yet. Add one above!")).toBeDefined();
		});
	});

	describe("view modes", () => {
		it("renders recipe cards in grid view by default", () => {
			renderPage();

			expect(screen.getByText("Pasta Bolognese")).toBeDefined();
			expect(screen.getAllByText("Italian").length).toBeGreaterThan(0);
		});

		it("switches to table view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("table view"));

			expect(screen.getByRole("table")).toBeDefined();
			expect(screen.getByText("Pasta Bolognese")).toBeDefined();
		});

		it("switches to compact view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("compact view"));

			expect(screen.getByText("Pasta Bolognese")).toBeDefined();
			expect(screen.getAllByText("Italian").length).toBeGreaterThan(0);
		});
	});

	describe("search filter", () => {
		it("renders search input", () => {
			renderPage();

			expect(screen.getByPlaceholderText("Search...")).toBeDefined();
		});

		it("filters recipes by name", () => {
			mockUseRecipes.mockReturnValue({
				data: [
					mockRecipe,
					{ ...mockRecipe, id: "2", name: "Caesar Salad", categoryId: null },
				],
				isLoading: false,
			});

			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Search..."), {
				target: { value: "pasta" },
			});

			expect(screen.getByText("Pasta Bolognese")).toBeDefined();
			expect(screen.queryByText("Caesar Salad")).toBeNull();
		});

		it("shows no results message when search matches nothing", () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Search..."), {
				target: { value: "xyz" },
			});

			expect(screen.getByText("No recipes match your search.")).toBeDefined();
		});

		it("is case-insensitive", () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Search..."), {
				target: { value: "PASTA" },
			});

			expect(screen.getByText("Pasta Bolognese")).toBeDefined();
		});
	});

	describe("quick-add form", () => {
		it("submits form with name", async () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Recipe name *"), {
				target: { value: "New Recipe" },
			});
			fireEvent.click(screen.getByText("Add"));

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					name: "New Recipe",
				});
			});
		});
	});
});
