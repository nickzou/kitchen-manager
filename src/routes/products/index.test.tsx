import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "#src/lib/hooks/use-products";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseProducts = vi.fn();
const mockUseCreateProduct = vi.fn();

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

vi.mock("#src/lib/hooks/use-products", () => ({
	useProducts: (...args: unknown[]) => mockUseProducts(...args),
	useCreateProduct: (...args: unknown[]) => mockUseCreateProduct(...args),
}));

const mockUseProductCategories = vi.fn();
vi.mock("#src/lib/hooks/use-categories", () => ({
	useProductCategories: (...args: unknown[]) =>
		mockUseProductCategories(...args),
}));

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("#src/components/InventorySubNav", () => ({
	default: () => <nav data-testid="inventory-sub-nav" />,
}));

vi.mock("#src/components/MultiCombobox", () => ({
	MultiCombobox: ({
		value,
		onChange,
		options,
		placeholder,
	}: {
		value: string[];
		onChange: (v: string[]) => void;
		options: { value: string; label: string }[];
		placeholder?: string;
	}) => (
		<select
			multiple
			value={value}
			onChange={(e) => {
				const selected = Array.from(e.target.selectedOptions, (o) => o.value);
				onChange(selected);
			}}
			aria-label={placeholder}
		>
			{options.map((o) => (
				<option key={o.value} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
	),
}));

import { Route } from "./index";

const mockProduct: Product = {
	id: "1",
	name: "Tomatoes",
	categoryIds: ["c1"],
	description: null,
	image: null,
	defaultQuantityUnitId: null,
	minStockAmount: "0",
	isFood: true,
	defaultExpirationDays: null,
	defaultConsumeAmount: null,
	defaultConsumeUnitId: null,
	calories: null,
	protein: null,
	fat: null,
	carbs: null,
	defaultTareWeight: null,
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
	mockUseProductCategories.mockReturnValue({
		data: [{ id: "c1", name: "Vegetables" }],
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
			expect(screen.getAllByText("Vegetables").length).toBeGreaterThan(0);
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
			expect(screen.getAllByText("Vegetables").length).toBeGreaterThan(0);
		});
	});

	describe("search filter", () => {
		it("renders search input", () => {
			renderPage();

			expect(screen.getByPlaceholderText("Search...")).toBeDefined();
		});

		it("filters products by name", () => {
			mockUseProducts.mockReturnValue({
				data: [
					mockProduct,
					{ ...mockProduct, id: "2", name: "Carrots", categoryIds: [] },
				],
				isLoading: false,
			});

			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Search..."), {
				target: { value: "tom" },
			});

			expect(screen.getByText("Tomatoes")).toBeDefined();
			expect(screen.queryByText("Carrots")).toBeNull();
		});

		it("shows no results message when search matches nothing", () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Search..."), {
				target: { value: "xyz" },
			});

			expect(screen.getByText("No products match your search.")).toBeDefined();
		});

		it("is case-insensitive", () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Search..."), {
				target: { value: "TOMATOES" },
			});

			expect(screen.getByText("Tomatoes")).toBeDefined();
		});
	});

	describe("quick-add form", () => {
		it("submits form with name", async () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Product name *"), {
				target: { value: "Carrots" },
			});
			fireEvent.click(screen.getByText("Add"));

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					name: "Carrots",
				});
			});
		});
	});
});
