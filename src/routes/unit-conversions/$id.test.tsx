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
const mockUseUnitConversion = vi.fn();
const mockUseUpdateUnitConversion = vi.fn();
const mockUseDeleteUnitConversion = vi.fn();
const mockUseQuantityUnits = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: ComponentType }) => ({
		component: opts.component,
		useParams: () => ({ id: "c1" }),
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
	useUnitConversion: (...args: unknown[]) => mockUseUnitConversion(...args),
	useUpdateUnitConversion: (...args: unknown[]) =>
		mockUseUpdateUnitConversion(...args),
	useDeleteUnitConversion: (...args: unknown[]) =>
		mockUseDeleteUnitConversion(...args),
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

import { Route } from "./$id";

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
	updatedAt: "2026-03-02T00:00:00Z",
};

const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteMutateAsync = vi.fn().mockResolvedValue({});

beforeEach(() => {
	vi.clearAllMocks();

	mockUseSession.mockReturnValue({
		data: { user: { id: "user1" }, session: { id: "s1" } },
		isPending: false,
	});
	mockUseUnitConversion.mockReturnValue({
		data: mockConversion,
		isLoading: false,
		error: null,
	});
	mockUseQuantityUnits.mockReturnValue({
		data: mockUnits,
		isLoading: false,
	});
	mockUseUpdateUnitConversion.mockReturnValue({
		mutateAsync: mockUpdateMutateAsync,
		isPending: false,
	});
	mockUseDeleteUnitConversion.mockReturnValue({
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

describe("UnitConversionDetail", () => {
	describe("authentication", () => {
		it("redirects to /sign-in when session is null", () => {
			mockUseSession.mockReturnValue({ data: null, isPending: false });

			renderPage();

			expect(mockNavigate).toHaveBeenCalledWith({ to: "/sign-in" });
		});
	});

	describe("error states", () => {
		it("shows 'Unit conversion not found' on error", () => {
			mockUseUnitConversion.mockReturnValue({
				data: null,
				isLoading: false,
				error: new Error("Not found"),
			});

			renderPage();

			expect(screen.getByText("Unit conversion not found")).toBeDefined();
		});
	});

	describe("view mode", () => {
		it("displays conversion details", () => {
			renderPage();

			expect(screen.getByText(/Kilogram \(kg\)/)).toBeDefined();
			expect(screen.getByText(/Gram \(g\)/)).toBeDefined();
			expect(screen.getByText("Factor: 1000")).toBeDefined();
		});
	});

	describe("edit flow", () => {
		it("shows edit form and saves changes", async () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Edit"));

			expect(screen.getByText("Edit unit conversion")).toBeDefined();

			const factorInput = screen.getByDisplayValue("1000");
			fireEvent.change(factorInput, { target: { value: "500" } });

			fireEvent.click(screen.getByText("Save changes"));

			await waitFor(() => {
				expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
					fromUnitId: "u1",
					toUnitId: "u2",
					factor: "500",
				});
			});
		});
	});

	describe("delete flow", () => {
		it("shows confirmation and cancels", () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Delete"));

			expect(
				screen.getByText("Delete this unit conversion? This cannot be undone."),
			).toBeDefined();

			fireEvent.click(screen.getByText("Cancel"));

			expect(
				screen.queryByText(
					"Delete this unit conversion? This cannot be undone.",
				),
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
				expect(mockDeleteMutateAsync).toHaveBeenCalledWith("c1");
			});

			await waitFor(() => {
				expect(mockNavigate).toHaveBeenCalledWith({
					to: "/unit-conversions",
				});
			});
		});
	});
});
