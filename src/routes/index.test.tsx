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
const mockUseQuantityUnits = vi.fn();
const mockUseStockEntries = vi.fn();
const mockUseConsumeStock = vi.fn();
const mockUseSpoilStock = vi.fn();
const mockUseReverseStockLog = vi.fn();
const mockUseToast = vi.fn();

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

vi.mock("#src/lib/hooks/use-quantity-units", () => ({
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
}));

vi.mock("#src/lib/hooks/use-stock-entries", () => ({
	useStockEntries: (...args: unknown[]) => mockUseStockEntries(...args),
	useConsumeStock: (...args: unknown[]) => mockUseConsumeStock(...args),
	useSpoilStock: (...args: unknown[]) => mockUseSpoilStock(...args),
}));

vi.mock("#src/lib/hooks/use-stock-logs", () => ({
	useReverseStockLog: (...args: unknown[]) => mockUseReverseStockLog(...args),
}));

vi.mock("#src/components/Toast", () => ({
	useToast: (...args: unknown[]) => mockUseToast(...args),
	ToastProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("#src/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

import { Route } from "./index";

// Use a date that is 2 days from now so it falls into the "< 3 days" bucket
const twoDaysFromNow = new Date();
twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
const expirationDate = twoDaysFromNow.toISOString();

const mockProduct = {
	id: "p1",
	name: "Milk",
	categoryIds: [],
	description: null,
	image: null,
	defaultQuantityUnitId: "qu1",
	minStockAmount: null,
	defaultExpirationDays: null,
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-01T00:00:00Z",
};

const mockStockEntry = {
	id: "se1",
	productId: "p1",
	quantity: "4",
	expirationDate,
	purchaseDate: "2026-03-01T00:00:00Z",
	price: null,
	storeId: null,
	brandId: null,
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-01T00:00:00Z",
};

const mockConsumeMutateAsync = vi
	.fn()
	.mockResolvedValue({ stockLogId: "log-1" });
const mockSpoilMutateAsync = vi.fn().mockResolvedValue({ stockLogId: "log-2" });
const mockReverseMutate = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();

	mockUseSession.mockReturnValue({
		data: { user: { id: "u1", name: "Alice Smith" }, session: { id: "s1" } },
		isPending: false,
	});
	mockUseProducts.mockReturnValue({ data: [mockProduct] });
	mockUseQuantityUnits.mockReturnValue({
		data: [{ id: "qu1", name: "Liters", abbreviation: "L" }],
	});
	mockUseStockEntries.mockReturnValue({ data: [mockStockEntry] });
	mockUseConsumeStock.mockReturnValue({
		mutateAsync: mockConsumeMutateAsync,
		isPending: false,
	});
	mockUseSpoilStock.mockReturnValue({
		mutateAsync: mockSpoilMutateAsync,
		isPending: false,
	});
	mockUseReverseStockLog.mockReturnValue({
		mutate: mockReverseMutate,
		isPending: false,
	});
	mockUseToast.mockReturnValue({
		success: vi.fn(),
		error: vi.fn(),
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

describe("Dashboard", () => {
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
		it("renders greeting with first name", () => {
			renderPage();
			expect(screen.getByText("Hey, Alice!")).toBeDefined();
		});

		it("renders dashboard heading", () => {
			renderPage();
			expect(screen.getByText("Dashboard")).toBeDefined();
		});

		it("renders expiring soon section", () => {
			renderPage();
			expect(
				screen.getByRole("heading", { name: "Expiring Soon" }),
			).toBeDefined();
		});

		it("shows expiring stock entry", () => {
			renderPage();
			expect(screen.getByText("Milk")).toBeDefined();
			expect(screen.getByText(/4/)).toBeDefined();
		});

		it("shows empty message when no expiring entries", () => {
			mockUseStockEntries.mockReturnValue({ data: [] });
			renderPage();
			expect(
				screen.getByText("Nothing expiring soon — you're all set!"),
			).toBeDefined();
		});

		it("shows 'View all stock' link", () => {
			renderPage();
			const link = screen.getByText("View all stock →");
			expect(link).toBeDefined();
			expect(link.closest("a")?.getAttribute("href")).toBe("/stock");
		});
	});

	describe("consume actions", () => {
		it("consumes by entered quantity", async () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Qty"), {
				target: { value: "2" },
			});

			const spoilBtn = screen
				.getAllByRole("button")
				.find(
					(b) =>
						b.textContent?.includes("Consume") &&
						!b.textContent?.includes("All"),
				);
			fireEvent.click(spoilBtn!);

			await waitFor(() => {
				expect(mockConsumeMutateAsync).toHaveBeenCalledWith({
					stockEntryId: "se1",
					quantity: "2",
				});
			});
		});

		it("consumes all with Consume All button", async () => {
			renderPage();

			const consumeAllBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Consume all remaining stock");
			fireEvent.click(consumeAllBtn!);

			await waitFor(() => {
				expect(mockConsumeMutateAsync).toHaveBeenCalledWith({
					stockEntryId: "se1",
					quantity: "4",
				});
			});
		});

		it("shows success toast with undo after consuming", async () => {
			const mockToast = { success: vi.fn(), error: vi.fn() };
			mockUseToast.mockReturnValue(mockToast);

			renderPage();

			const consumeAllBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Consume all remaining stock");
			fireEvent.click(consumeAllBtn!);

			await waitFor(() => {
				expect(mockToast.success).toHaveBeenCalledWith(
					"4 L Milk consumed",
					expect.objectContaining({ label: "Undo" }),
				);
			});
		});

		it("calls reverseStockLog when undo is clicked", async () => {
			const mockToast = { success: vi.fn(), error: vi.fn() };
			mockUseToast.mockReturnValue(mockToast);

			renderPage();

			const consumeAllBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Consume all remaining stock");
			fireEvent.click(consumeAllBtn!);

			await waitFor(() => {
				expect(mockToast.success).toHaveBeenCalled();
			});

			const undoAction = mockToast.success.mock.calls[0][1];
			undoAction.onClick();

			expect(mockReverseMutate).toHaveBeenCalledWith({
				stockLogId: "log-1",
				stockEntryId: "se1",
			});
		});

		it("shows error toast when consume fails", async () => {
			const mockToast = { success: vi.fn(), error: vi.fn() };
			mockUseToast.mockReturnValue(mockToast);
			mockConsumeMutateAsync.mockRejectedValueOnce(new Error("fail"));

			renderPage();

			const consumeAllBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Consume all remaining stock");
			fireEvent.click(consumeAllBtn!);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith("Failed to consume Milk");
			});
		});
	});

	describe("spoil actions", () => {
		it("spoils by entered quantity", async () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Qty"), {
				target: { value: "1" },
			});

			const spoilBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Mark amount as spoiled");
			fireEvent.click(spoilBtn!);

			await waitFor(() => {
				expect(mockSpoilMutateAsync).toHaveBeenCalledWith({
					stockEntryId: "se1",
					quantity: "1",
				});
			});
		});

		it("spoils all with Spoil All button", async () => {
			renderPage();

			const spoilAllBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Mark all as spoiled");
			fireEvent.click(spoilAllBtn!);

			await waitFor(() => {
				expect(mockSpoilMutateAsync).toHaveBeenCalledWith({
					stockEntryId: "se1",
					quantity: "4",
				});
			});
		});

		it("shows success toast with undo after spoiling all", async () => {
			const mockToast = { success: vi.fn(), error: vi.fn() };
			mockUseToast.mockReturnValue(mockToast);

			renderPage();

			const spoilAllBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Mark all as spoiled");
			fireEvent.click(spoilAllBtn!);

			await waitFor(() => {
				expect(mockToast.success).toHaveBeenCalledWith(
					"All Milk marked as spoiled",
					expect.objectContaining({ label: "Undo" }),
				);
			});
		});

		it("shows success toast after spoiling by amount", async () => {
			const mockToast = { success: vi.fn(), error: vi.fn() };
			mockUseToast.mockReturnValue(mockToast);

			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Qty"), {
				target: { value: "1" },
			});

			const spoilBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Mark amount as spoiled");
			fireEvent.click(spoilBtn!);

			await waitFor(() => {
				expect(mockToast.success).toHaveBeenCalledWith(
					"Milk marked as spoiled",
					expect.objectContaining({ label: "Undo" }),
				);
			});
		});

		it("shows error toast when spoil fails", async () => {
			const mockToast = { success: vi.fn(), error: vi.fn() };
			mockUseToast.mockReturnValue(mockToast);
			mockSpoilMutateAsync.mockRejectedValueOnce(new Error("fail"));

			renderPage();

			const spoilAllBtn = screen
				.getAllByRole("button")
				.find((b) => b.title === "Mark all as spoiled");
			fireEvent.click(spoilAllBtn!);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith(
					"Failed to mark Milk as spoiled",
				);
			});
		});
	});
});
