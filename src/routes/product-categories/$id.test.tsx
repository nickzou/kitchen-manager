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
const mockUseProductCategory = vi.fn();
const mockUseUpdateProductCategory = vi.fn();
const mockUseDeleteProductCategory = vi.fn();

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

vi.mock("#src/lib/hooks/use-categories", () => ({
	useProductCategory: (...args: unknown[]) => mockUseProductCategory(...args),
	useUpdateProductCategory: (...args: unknown[]) =>
		mockUseUpdateProductCategory(...args),
	useDeleteProductCategory: (...args: unknown[]) =>
		mockUseDeleteProductCategory(...args),
}));

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("#src/components/InventorySubNav", () => ({
	default: () => <nav data-testid="inventory-sub-nav" />,
}));

import { Route } from "./$id";

const mockCategory: Category = {
	id: "1",
	name: "Vegetables",
	description: "Fresh vegetables",
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
	mockUseProductCategory.mockReturnValue({
		data: mockCategory,
		isLoading: false,
		error: null,
	});
	mockUseUpdateProductCategory.mockReturnValue({
		mutateAsync: mockUpdateMutateAsync,
		isPending: false,
	});
	mockUseDeleteProductCategory.mockReturnValue({
		mutateAsync: mockDeleteMutateAsync,
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

describe("ProductCategoryDetail", () => {
	describe("authentication", () => {
		it("redirects to /sign-in when session is null", () => {
			mockUseSession.mockReturnValue({ data: null, isPending: false });

			renderPage();

			expect(mockNavigate).toHaveBeenCalledWith({ to: "/sign-in" });
		});
	});

	describe("error states", () => {
		it("shows 'Category not found' on error", () => {
			mockUseProductCategory.mockReturnValue({
				data: null,
				isLoading: false,
				error: new Error("Not found"),
			});

			renderPage();

			expect(screen.getByText("Category not found")).toBeDefined();
		});
	});

	describe("view mode", () => {
		it("displays category details", () => {
			renderPage();

			expect(screen.getByText("Vegetables")).toBeDefined();
			expect(screen.getByText("Fresh vegetables")).toBeDefined();
		});
	});

	describe("edit flow", () => {
		it("shows edit form and saves changes", async () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Edit"));

			expect(screen.getByText("Edit category")).toBeDefined();

			const nameInput = screen.getByDisplayValue("Vegetables");
			fireEvent.change(nameInput, { target: { value: "Root Vegetables" } });

			fireEvent.click(screen.getByText("Save changes"));

			await waitFor(() => {
				expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
					name: "Root Vegetables",
					description: "Fresh vegetables",
				});
			});
		});
	});

	describe("delete flow", () => {
		it("shows confirmation and cancels", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Delete"));

			expect(
				screen.getByText("Delete this category? This cannot be undone."),
			).toBeDefined();

			fireEvent.click(screen.getByText("Cancel"));

			expect(
				screen.queryByText("Delete this category? This cannot be undone."),
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
				expect(mockNavigate).toHaveBeenCalledWith({
					to: "/product-categories",
				});
			});
		});
	});
});
