import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseProducts = vi.fn();
const mockUseCategories = vi.fn();
const mockUseQuantityUnits = vi.fn();
const mockUseStockEntries = vi.fn();
const mockUseStockLogs = vi.fn();
const mockUseCreateStockEntry = vi.fn();
const mockUseDeleteStockEntry = vi.fn();
const mockUseConsumeStock = vi.fn();
const mockUseStores = vi.fn();

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
}));

vi.mock("#src/lib/hooks/use-categories", () => ({
	useProductCategories: (...args: unknown[]) => mockUseCategories(...args),
}));

vi.mock("#src/lib/hooks/use-quantity-units", () => ({
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
}));

vi.mock("#src/lib/hooks/use-stock-entries", () => ({
	useStockEntries: (...args: unknown[]) => mockUseStockEntries(...args),
	useCreateStockEntry: (...args: unknown[]) => mockUseCreateStockEntry(...args),
	useDeleteStockEntry: (...args: unknown[]) => mockUseDeleteStockEntry(...args),
	useConsumeStock: (...args: unknown[]) => mockUseConsumeStock(...args),
}));

vi.mock("#src/lib/hooks/use-stock-logs", () => ({
	useStockLogs: (...args: unknown[]) => mockUseStockLogs(...args),
}));

vi.mock("#src/lib/hooks/use-stores", () => ({
	useStores: (...args: unknown[]) => mockUseStores(...args),
}));

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("#src/components/Combobox", () => ({
	Combobox: ({
		value,
		onChange,
		options,
		placeholder,
		required,
	}: {
		value: string;
		onChange: (v: string) => void;
		options: { value: string; label: string }[];
		placeholder?: string;
		required?: boolean;
	}) => (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			required={required}
			aria-label={placeholder}
		>
			<option value="">{placeholder}</option>
			{options.map((o) => (
				<option key={o.value} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
	),
}));

vi.mock("#src/components/DatePicker", () => ({
	DatePicker: ({
		value,
		onChange,
		placeholder,
	}: {
		value?: string;
		onChange: (v: string) => void;
		placeholder?: string;
	}) => (
		<input
			type="text"
			placeholder={placeholder}
			value={value ?? ""}
			onChange={(e) => onChange(e.target.value)}
			data-testid="date-picker"
		/>
	),
}));

import { Route } from "./index";

const mockProduct = {
	id: "p1",
	name: "Tomatoes",
	categoryIds: ["c1"],
	description: null,
	image: null,
	defaultQuantityUnitId: "qu1",
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
	storeId: null,
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
	mockUseDeleteStockEntry.mockReturnValue({
		mutate: vi.fn(),
		mutateAsync: mockMutateAsync,
		isPending: false,
	});
	mockUseConsumeStock.mockReturnValue({
		mutateAsync: mockMutateAsync,
		isPending: false,
	});
	mockUseStores.mockReturnValue({ data: [] });
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

			expect(
				screen.getByRole("heading", { name: "Stock", level: 1 }),
			).toBeDefined();
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

			fireEvent.click(screen.getByRole("button", { name: "Recent Activity" }));

			expect(screen.getByText("add")).toBeDefined();
		});
	});

	describe("search filter", () => {
		it("renders search input", () => {
			renderPage();

			expect(screen.getByPlaceholderText("Search...")).toBeDefined();
		});

		it("filters products by name", () => {
			const mockProduct2 = {
				...mockProduct,
				id: "p2",
				name: "Carrots",
				categoryIds: [],
			};
			mockUseProducts.mockReturnValue({ data: [mockProduct, mockProduct2] });
			mockUseStockEntries.mockReturnValue({
				data: [
					mockStockEntry,
					{ ...mockStockEntry, id: "se2", productId: "p2" },
				],
				isLoading: false,
			});

			renderPage();

			// Both products visible in stock list before search
			const carrotsBefore = screen.getAllByText("Carrots");
			expect(carrotsBefore.length).toBeGreaterThan(0);

			fireEvent.change(screen.getByPlaceholderText("Search..."), {
				target: { value: "tom" },
			});

			// Tomatoes still visible in stock list
			expect(screen.getAllByText("Tomatoes").length).toBeGreaterThan(0);
			// Carrots only appears in the combobox dropdown, not in the stock list
			const carrotsAfter = screen.queryAllByText("Carrots");
			// Should only be in the select option, not in a button (stock list item)
			for (const el of carrotsAfter) {
				expect(el.tagName).toBe("OPTION");
			}
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

			expect(screen.getAllByText("Tomatoes").length).toBeGreaterThan(0);
		});
	});

	describe("quick-add form", () => {
		it("submits stock entry form", async () => {
			renderPage();

			fireEvent.change(
				screen.getByRole("combobox", { name: "Select product *" }),
				{ target: { value: "p1" } },
			);
			fireEvent.change(screen.getByPlaceholderText("Quantity *"), {
				target: { value: "5" },
			});
			fireEvent.click(screen.getAllByRole("button", { name: /Add Stock/ })[0]);

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					productId: "p1",
					quantity: "5",
					expirationDate: undefined,
					purchaseDate: expect.any(String),
					price: undefined,
					storeId: undefined,
					brandId: undefined,
				});
			});
		});
	});
});
