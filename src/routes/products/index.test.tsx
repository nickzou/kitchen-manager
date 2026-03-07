import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "#/lib/hooks/use-products";
import { createTestWrapper } from "#/tests/helpers/test-wrapper";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseProducts = vi.fn();
const mockUseCreateProduct = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => ({
		component: opts.component,
	}),
	useNavigate: () => mockNavigate,
	Link: ({ children, to, ...props }: Record<string, unknown>) => (
		<a href={to as string} {...props}>
			{children as React.ReactNode}
		</a>
	),
}));

vi.mock("#/lib/auth-client", () => ({
	authClient: { useSession: (...args: unknown[]) => mockUseSession(...args) },
}));

vi.mock("#/lib/hooks/use-products", () => ({
	useProducts: (...args: unknown[]) => mockUseProducts(...args),
	useCreateProduct: (...args: unknown[]) => mockUseCreateProduct(...args),
}));

vi.mock("#/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { Route } from "./index";

const mockProduct: Product = {
	id: "1",
	name: "Tomatoes",
	category: "Vegetables",
	description: null,
	image: null,
	expirationDate: "2026-04-01",
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
	mockUseProducts.mockReturnValue({
		data: [mockProduct],
		isLoading: false,
	});
	mockUseCreateProduct.mockReturnValue({
		mutateAsync: mockMutateAsync,
		isPending: false,
	});
});

afterEach(() => {
	cleanup();
});

function renderPage() {
	const Component = (Route as unknown as { component: React.ComponentType })
		.component;
	const Wrapper = createTestWrapper();
	return render(<Component />, { wrapper: Wrapper });
}

describe("ProductsPage", () => {
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
		it("shows loading state when products are loading", () => {
			mockUseProducts.mockReturnValue({
				data: undefined,
				isLoading: true,
			});

			renderPage();

			expect(screen.getByText("Loading…")).toBeDefined();
		});

		it("shows empty state when no products", () => {
			mockUseProducts.mockReturnValue({
				data: [],
				isLoading: false,
			});

			renderPage();

			expect(screen.getByText("No products yet. Add one above!")).toBeDefined();
		});
	});

	describe("view modes", () => {
		it("renders product cards in grid view by default", () => {
			renderPage();

			expect(screen.getByText("Tomatoes")).toBeDefined();
			expect(screen.getByText("Vegetables")).toBeDefined();
		});

		it("switches to table view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("table view"));

			expect(screen.getByRole("table")).toBeDefined();
			expect(screen.getByText("Tomatoes")).toBeDefined();
		});

		it("switches to compact view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("compact view"));

			expect(screen.getByText("Tomatoes")).toBeDefined();
			expect(screen.getByText("Vegetables")).toBeDefined();
		});
	});

	describe("quick-add form", () => {
		it("submits form with name and category", async () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Product name *"), {
				target: { value: "Carrots" },
			});
			fireEvent.change(screen.getByPlaceholderText("Category"), {
				target: { value: "Vegetables" },
			});
			fireEvent.click(screen.getByText("Add"));

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					name: "Carrots",
					category: "Vegetables",
					expirationDate: undefined,
				});
			});
		});
	});
});
