import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "#src/lib/hooks/use-categories";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseRecipeCategories = vi.fn();
const mockUseCreateRecipeCategory = vi.fn();

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

vi.mock("#src/lib/hooks/use-categories", () => ({
	useRecipeCategories: (...args: unknown[]) => mockUseRecipeCategories(...args),
	useCreateRecipeCategory: (...args: unknown[]) =>
		mockUseCreateRecipeCategory(...args),
}));

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("#src/components/CookingSubNav", () => ({
	default: () => <nav data-testid="cooking-sub-nav" />,
}));

import { Route } from "./index";

const mockCategory: Category = {
	id: "1",
	name: "Quick Meals",
	description: "Fast recipes",
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
	mockUseRecipeCategories.mockReturnValue({
		data: [mockCategory],
		isLoading: false,
	});
	mockUseCreateRecipeCategory.mockReturnValue({
		mutateAsync: mockMutateAsync,
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

describe("RecipeCategoriesPage", () => {
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
		it("shows loading state when categories are loading", () => {
			mockUseRecipeCategories.mockReturnValue({
				data: undefined,
				isLoading: true,
			});

			renderPage();

			expect(screen.getByText("Loading…")).toBeDefined();
		});

		it("shows empty state when no categories", () => {
			mockUseRecipeCategories.mockReturnValue({
				data: [],
				isLoading: false,
			});

			renderPage();

			expect(
				screen.getByText("No categories yet. Add one above!"),
			).toBeDefined();
		});
	});

	describe("view modes", () => {
		it("renders category cards in grid view by default", () => {
			renderPage();

			expect(screen.getByText("Quick Meals")).toBeDefined();
			expect(screen.getByText("Fast recipes")).toBeDefined();
		});

		it("switches to table view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("table view"));

			expect(screen.getByRole("table")).toBeDefined();
			expect(screen.getByText("Quick Meals")).toBeDefined();
		});

		it("switches to compact view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("compact view"));

			expect(screen.getByText("Quick Meals")).toBeDefined();
			expect(screen.getByText("Fast recipes")).toBeDefined();
		});
	});

	describe("search filter", () => {
		it("shows no results message when search matches nothing", () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Search..."), {
				target: { value: "xyz" },
			});

			expect(
				screen.getByText("No categories match your search."),
			).toBeDefined();
		});
	});

	describe("quick-add form", () => {
		it("submits form with name and description", async () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Category name *"), {
				target: { value: "Dinner" },
			});
			fireEvent.change(screen.getByPlaceholderText("Description"), {
				target: { value: "Dinner recipes" },
			});
			fireEvent.click(screen.getByText("Add"));

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					name: "Dinner",
					description: "Dinner recipes",
				});
			});
		});
	});
});
