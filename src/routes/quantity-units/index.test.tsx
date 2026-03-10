import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuantityUnit } from "#/lib/hooks/use-quantity-units";
import type { UnitConversion } from "#/lib/hooks/use-unit-conversions";
import { createTestWrapper } from "#/tests/helpers/test-wrapper";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseQuantityUnits = vi.fn();
const mockUseCreateQuantityUnit = vi.fn();
const mockUseUnitConversions = vi.fn();

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

vi.mock("#/lib/auth-client", () => ({
	authClient: { useSession: (...args: unknown[]) => mockUseSession(...args) },
}));

vi.mock("#/lib/hooks/use-quantity-units", () => ({
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
	useCreateQuantityUnit: (...args: unknown[]) =>
		mockUseCreateQuantityUnit(...args),
}));

vi.mock("#/lib/hooks/use-unit-conversions", () => ({
	useUnitConversions: (...args: unknown[]) => mockUseUnitConversions(...args),
}));

vi.mock("#/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("#/components/InventorySubNav", () => ({
	default: () => <nav data-testid="inventory-sub-nav" />,
}));

import { Route } from "./index";

const mockKilogram: QuantityUnit = {
	id: "1",
	name: "Kilogram",
	abbreviation: "kg",
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-01T00:00:00Z",
};

const mockGram: QuantityUnit = {
	id: "2",
	name: "Gram",
	abbreviation: "g",
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-01T00:00:00Z",
};

const mockConversion: UnitConversion = {
	id: "c1",
	fromUnitId: "1",
	toUnitId: "2",
	factor: "1000",
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
	mockUseQuantityUnits.mockReturnValue({
		data: [mockKilogram, mockGram],
		isLoading: false,
	});
	mockUseCreateQuantityUnit.mockReturnValue({
		mutateAsync: mockMutateAsync,
		isPending: false,
	});
	mockUseUnitConversions.mockReturnValue({
		data: [mockConversion],
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

describe("QuantityUnitsPage", () => {
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
		it("shows loading state when quantity units are loading", () => {
			mockUseQuantityUnits.mockReturnValue({
				data: undefined,
				isLoading: true,
			});

			renderPage();

			expect(screen.getByText("Loading…")).toBeDefined();
		});

		it("shows empty state when no quantity units", () => {
			mockUseQuantityUnits.mockReturnValue({
				data: [],
				isLoading: false,
			});

			renderPage();

			expect(
				screen.getByText("No quantity units yet. Add one above!"),
			).toBeDefined();
		});
	});

	describe("view modes", () => {
		it("renders quantity unit cards in grid view by default", () => {
			renderPage();

			expect(screen.getByText("Kilogram")).toBeDefined();
			expect(screen.getByText("kg")).toBeDefined();
		});

		it("shows conversions in grid view", () => {
			renderPage();

			const conversionLines = screen.getAllByTestId("conversion-line");
			expect(conversionLines.length).toBeGreaterThanOrEqual(1);
			expect(conversionLines[0].textContent).toContain("Gram (g)");
			expect(conversionLines[0].textContent).toContain("1000");
		});

		it("switches to table view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("table view"));

			expect(screen.getByRole("table")).toBeDefined();
			expect(screen.getByText("Kilogram")).toBeDefined();
		});

		it("shows expandable conversions in table view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("table view"));

			const toggleButtons = screen.getAllByTitle("Toggle conversions");
			expect(toggleButtons.length).toBeGreaterThanOrEqual(1);

			fireEvent.click(toggleButtons[0]);

			const conversionLines = screen.getAllByTestId("conversion-line");
			expect(conversionLines.length).toBeGreaterThanOrEqual(1);
		});

		it("switches to compact view without conversions", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("compact view"));

			expect(screen.getByText("Kilogram")).toBeDefined();
			expect(screen.getByText("kg")).toBeDefined();
			expect(screen.queryAllByTestId("conversion-line")).toHaveLength(0);
		});
	});

	describe("quick-add form", () => {
		it("submits form with name and abbreviation", async () => {
			renderPage();

			fireEvent.change(screen.getByPlaceholderText("Unit name *"), {
				target: { value: "Liter" },
			});
			fireEvent.change(screen.getByPlaceholderText("Abbreviation"), {
				target: { value: "L" },
			});
			fireEvent.click(screen.getByText("Add"));

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					name: "Liter",
					abbreviation: "L",
				});
			});
		});
	});
});
