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
const mockUseUnitConversions = vi.fn();
const mockUseCreateUnitConversion = vi.fn();
const mockUseQuantityUnits = vi.fn();

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

vi.mock("#/lib/hooks/use-unit-conversions", () => ({
	useUnitConversions: (...args: unknown[]) => mockUseUnitConversions(...args),
	useCreateUnitConversion: (...args: unknown[]) =>
		mockUseCreateUnitConversion(...args),
}));

vi.mock("#/lib/hooks/use-quantity-units", () => ({
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
}));

vi.mock("#/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("#/components/InventorySubNav", () => ({
	default: () => <nav data-testid="inventory-sub-nav" />,
}));

vi.mock("#/components/Combobox", () => ({
	Combobox: ({
		placeholder,
		value,
		onChange,
	}: {
		placeholder?: string;
		value: string;
		onChange: (v: string) => void;
	}) => (
		<select
			data-testid={`combobox-${placeholder}`}
			value={value}
			onChange={(e) => onChange(e.target.value)}
		>
			<option value="">—</option>
			<option value="u1">Kilogram (kg)</option>
			<option value="u2">Gram (g)</option>
		</select>
	),
}));

import { Route } from "./index";

const mockUnits: QuantityUnit[] = [
	{
		id: "u1",
		name: "Kilogram",
		abbreviation: "kg",
		userId: "user1",
		createdAt: "2026-03-01T00:00:00Z",
		updatedAt: "2026-03-01T00:00:00Z",
	},
	{
		id: "u2",
		name: "Gram",
		abbreviation: "g",
		userId: "user1",
		createdAt: "2026-03-01T00:00:00Z",
		updatedAt: "2026-03-01T00:00:00Z",
	},
];

const mockConversion: UnitConversion = {
	id: "c1",
	fromUnitId: "u1",
	toUnitId: "u2",
	factor: "1000",
	userId: "user1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-01T00:00:00Z",
};

const mockMutateAsync = vi.fn().mockResolvedValue({});

beforeEach(() => {
	vi.clearAllMocks();

	mockUseSession.mockReturnValue({
		data: { user: { id: "user1" }, session: { id: "s1" } },
		isPending: false,
	});
	mockUseUnitConversions.mockReturnValue({
		data: [mockConversion],
		isLoading: false,
	});
	mockUseQuantityUnits.mockReturnValue({
		data: mockUnits,
		isLoading: false,
	});
	mockUseCreateUnitConversion.mockReturnValue({
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

describe("UnitConversionsPage", () => {
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
		it("shows loading state when conversions are loading", () => {
			mockUseUnitConversions.mockReturnValue({
				data: undefined,
				isLoading: true,
			});

			renderPage();

			expect(screen.getByText("Loading…")).toBeDefined();
		});

		it("shows empty state when no conversions", () => {
			mockUseUnitConversions.mockReturnValue({
				data: [],
				isLoading: false,
			});

			renderPage();

			expect(
				screen.getByText("No unit conversions yet. Add one above!"),
			).toBeDefined();
		});
	});

	describe("view modes", () => {
		it("renders conversion cards in grid view by default", () => {
			renderPage();

			expect(screen.getAllByText(/Kilogram \(kg\)/).length).toBeGreaterThan(0);
			expect(screen.getAllByText(/Gram \(g\)/).length).toBeGreaterThan(0);
			expect(screen.getByText("Factor: 1000")).toBeDefined();
		});

		it("switches to table view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("table view"));

			expect(screen.getByRole("table")).toBeDefined();
			expect(screen.getAllByText("Kilogram (kg)").length).toBeGreaterThan(0);
		});

		it("switches to compact view", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("compact view"));

			expect(screen.getAllByText(/Kilogram \(kg\)/).length).toBeGreaterThan(0);
			expect(screen.getByText("1000")).toBeDefined();
		});
	});

	describe("quick-add form", () => {
		it("submits form with from/to units and factor", async () => {
			renderPage();

			fireEvent.change(screen.getByTestId("combobox-From unit *"), {
				target: { value: "u1" },
			});
			fireEvent.change(screen.getByTestId("combobox-To unit *"), {
				target: { value: "u2" },
			});
			fireEvent.change(screen.getByPlaceholderText("Factor *"), {
				target: { value: "1000" },
			});
			fireEvent.click(screen.getByText("Add"));

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith({
					fromUnitId: "u1",
					toUnitId: "u2",
					factor: "1000",
				});
			});
		});
	});
});
