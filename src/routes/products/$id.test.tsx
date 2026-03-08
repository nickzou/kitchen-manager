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
const mockUseProduct = vi.fn();
const mockUseUpdateProduct = vi.fn();
const mockUseDeleteProduct = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => ({
		component: opts.component,
		useParams: () => ({ id: "1" }),
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
	useProduct: (...args: unknown[]) => mockUseProduct(...args),
	useUpdateProduct: (...args: unknown[]) => mockUseUpdateProduct(...args),
	useDeleteProduct: (...args: unknown[]) => mockUseDeleteProduct(...args),
}));

const mockUseCategories = vi.fn();
vi.mock("#/lib/hooks/use-categories", () => ({
	useCategories: (...args: unknown[]) => mockUseCategories(...args),
}));

const mockUseQuantityUnits = vi.fn();
vi.mock("#/lib/hooks/use-quantity-units", () => ({
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
}));

vi.mock("#/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { Route } from "./$id";

const mockProduct: Product = {
	id: "1",
	name: "Tomatoes",
	categoryId: "c1",
	description: "Fresh red tomatoes",
	image: null,
	quantityUnitId: null,
	minStockAmount: "0",
	defaultExpirationDays: null,
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-02T00:00:00Z",
};

const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteMutateAsync = vi.fn().mockResolvedValue({});

beforeEach(() => {
	vi.clearAllMocks();

	mockUseSession.mockReturnValue({
		data: { user: { id: "u1" }, session: { id: "s1" } },
		isPending: false,
	});
	mockUseProduct.mockReturnValue({
		data: mockProduct,
		isLoading: false,
		error: null,
	});
	mockUseUpdateProduct.mockReturnValue({
		mutateAsync: mockUpdateMutateAsync,
		isPending: false,
	});
	mockUseDeleteProduct.mockReturnValue({
		mutateAsync: mockDeleteMutateAsync,
		isPending: false,
	});
	mockUseCategories.mockReturnValue({
		data: [{ id: "c1", name: "Vegetables" }],
	});
	mockUseQuantityUnits.mockReturnValue({
		data: [{ id: "qu1", name: "Kilograms", abbreviation: "kg" }],
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

describe("ProductDetail", () => {
	describe("authentication", () => {
		it("redirects to /sign-in when session is null", () => {
			mockUseSession.mockReturnValue({ data: null, isPending: false });

			renderPage();

			expect(mockNavigate).toHaveBeenCalledWith({ to: "/sign-in" });
		});
	});

	describe("error states", () => {
		it("shows 'Product not found' on error", () => {
			mockUseProduct.mockReturnValue({
				data: null,
				isLoading: false,
				error: new Error("Not found"),
			});

			renderPage();

			expect(screen.getByText("Product not found")).toBeDefined();
		});
	});

	describe("view mode", () => {
		it("displays product details", () => {
			renderPage();

			expect(screen.getByText("Tomatoes")).toBeDefined();
			expect(screen.getByText("Vegetables")).toBeDefined();
			expect(screen.getByText("Fresh red tomatoes")).toBeDefined();
		});
	});

	describe("edit flow", () => {
		it("shows edit form and saves changes", async () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Edit"));

			expect(screen.getByText("Edit product")).toBeDefined();

			const nameInput = screen.getByDisplayValue("Tomatoes");
			fireEvent.change(nameInput, { target: { value: "Cherry Tomatoes" } });

			fireEvent.click(screen.getByText("Save changes"));

			await waitFor(() => {
				expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
					name: "Cherry Tomatoes",
					description: "Fresh red tomatoes",
					categoryId: "c1",
					quantityUnitId: undefined,
					minStockAmount: undefined,
					defaultExpirationDays: undefined,
				});
			});
		});
	});

	describe("delete flow", () => {
		it("shows confirmation and cancels", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Delete"));

			expect(
				screen.getByText("Delete this product? This cannot be undone."),
			).toBeDefined();

			fireEvent.click(screen.getByText("Cancel"));

			expect(
				screen.queryByText("Delete this product? This cannot be undone."),
			).toBeNull();
		});

		it("confirms delete and navigates", async () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Delete"));

			// Click the confirm "Delete" button (inside the confirmation dialog)
			const buttons = screen.getAllByText("Delete");
			const confirmButton = buttons.find((b) =>
				b.className.includes("bg-red-600"),
			) as HTMLElement;
			fireEvent.click(confirmButton);

			await waitFor(() => {
				expect(mockDeleteMutateAsync).toHaveBeenCalledWith("1");
			});

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({ to: "/products" });
			});
		});
	});
});
