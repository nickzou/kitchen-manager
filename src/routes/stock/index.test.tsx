import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#/tests/helpers/test-wrapper";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseProducts = vi.fn();
const mockUseCategories = vi.fn();
const mockUseQuantityUnits = vi.fn();
const mockUseStockEntries = vi.fn();
const mockUseStockLogs = vi.fn();
const mockUseCreateStockEntry = vi.fn();
const mockUseConsumeStock = vi.fn();

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
}));

vi.mock("#/lib/hooks/use-categories", () => ({
	useCategories: (...args: unknown[]) => mockUseCategories(...args),
}));

vi.mock("#/lib/hooks/use-quantity-units", () => ({
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
}));

vi.mock("#/lib/hooks/use-stock-entries", () => ({
	useStockEntries: (...args: unknown[]) => mockUseStockEntries(...args),
	useCreateStockEntry: (...args: unknown[]) => mockUseCreateStockEntry(...args),
	useConsumeStock: (...args: unknown[]) => mockUseConsumeStock(...args),
}));

vi.mock("#/lib/hooks/use-stock-logs", () => ({
	useStockLogs: (...args: unknown[]) => mockUseStockLogs(...args),
}));

vi.mock("#/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { Route } from "./index";

const mockProduct = {
	id: "p1",
	name: "Tomatoes",
	categoryId: "c1",
	description: null,
	image: null,
	quantityUnitId: "qu1",
	minStockAmount: "5",
	defaultExpirationDays: 14,
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-01T00:00:00Z",
};

const mockStockEntry = {
	id: "se1",
	productId: "p1",
	quantity: "10",
	expirationDate: "2026-04-01T00:00:00Z",
	purchaseDate: "2026-03-01T00:00:00Z",
	price: "5.99",
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-01T00:00:00Z",
};

const mockStockLog = {
	id: "sl1",
	stockEntryId: "se1",
	productId: "p1",
	transactionType: "add" as const,
	quantity: "10",
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
	mockUseProducts.mockReturnValue({ data: [mockProduct] });
	mockUseCategories.mockReturnValue({
		data: [{ id: "c1", name: "Vegetables" }],
	});
	mockUseQuantityUnits.mockReturnValue({
		data: [{ id: "qu1", name: "Kilograms", abbreviation: "kg" }],
	});
	mockUseStockEntries.mockReturnValue({
		data: [mockStockEntry],
		isLoading: false,
	});
	mockUseStockLogs.mockReturnValue({ data: [mockStockLog] });
	mockUseCreateStockEntry.mockReturnValue({
		mutateAsync: mockMutateAsync,
		isPending: false,
	});
	mockUseConsumeStock.mockReturnValue({
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

describe("StockPage", () => {
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

	describe("page content", () => {
		it("renders the stock page title", () => {
			renderPage();

			expect(screen.getByText("Stock")).toBeDefined();
			expect(screen.getByText("Inventory")).toBeDefined();
		});

		it("shows product stock list with totals", () => {
			renderPage();

			expect(screen.getAllByText("Tomatoes").length).toBeGreaterThan(0);
		});

		it("shows loading state when entries are loading", () => {
			mockUseStockEntries.mockReturnValue({
				data: undefined,
				isLoading: true,
			});

			renderPage();

			expect(screen.getByText("Loading…")).toBeDefined();
		});

		it("shows recent activity section", () => {
			renderPage();

			expect(screen.getByText("Recent Activity")).toBeDefined();
			expect(screen.getByText("add")).toBeDefined();
		});
	});

	describe("quick-add form", () => {
		it("submits stock entry form", async () => {
			renderPage();

			fireEvent.change(screen.getByRole("combobox"), {
				target: { value: "p1" },
			});
			fireEvent.change(screen.getByPlaceholderText("Quantity *"), {
				target: { value: "5" },
			});
			fireEvent.click(screen.getByText("Add Stock"));

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					productId: "p1",
					quantity: "5",
					expirationDate: undefined,
					price: undefined,
				});
			});
		});
	});
});
