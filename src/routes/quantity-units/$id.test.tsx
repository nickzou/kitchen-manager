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
const mockUseQuantityUnit = vi.fn();
const mockUseQuantityUnits = vi.fn();
const mockUseUpdateQuantityUnit = vi.fn();
const mockUseDeleteQuantityUnit = vi.fn();
const mockUseUnitConversions = vi.fn();
const mockUseCreateUnitConversion = vi.fn();
const mockUseUpdateUnitConversion = vi.fn();
const mockUseDeleteUnitConversion = vi.fn();

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

vi.mock("#/lib/auth-client", () => ({
	authClient: { useSession: (...args: unknown[]) => mockUseSession(...args) },
}));

vi.mock("#/lib/hooks/use-quantity-units", () => ({
	useQuantityUnit: (...args: unknown[]) => mockUseQuantityUnit(...args),
	useQuantityUnits: (...args: unknown[]) => mockUseQuantityUnits(...args),
	useUpdateQuantityUnit: (...args: unknown[]) =>
		mockUseUpdateQuantityUnit(...args),
	useDeleteQuantityUnit: (...args: unknown[]) =>
		mockUseDeleteQuantityUnit(...args),
}));

vi.mock("#/lib/hooks/use-unit-conversions", () => ({
	useUnitConversions: (...args: unknown[]) => mockUseUnitConversions(...args),
	useCreateUnitConversion: (...args: unknown[]) =>
		mockUseCreateUnitConversion(...args),
	useUpdateUnitConversion: (...args: unknown[]) =>
		mockUseUpdateUnitConversion(...args),
	useDeleteUnitConversion: (...args: unknown[]) =>
		mockUseDeleteUnitConversion(...args),
}));

vi.mock("#/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("#/components/InventorySubNav", () => ({
	default: () => <nav data-testid="inventory-sub-nav" />,
}));

vi.mock("#/components/Combobox", () => ({
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
			data-testid="combobox"
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

import { Route } from "./$id";

const mockKilogram: QuantityUnit = {
	id: "1",
	name: "Kilogram",
	abbreviation: "kg",
	userId: "u1",
	createdAt: "2026-03-01T00:00:00Z",
	updatedAt: "2026-03-02T00:00:00Z",
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

const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteMutateAsync = vi.fn().mockResolvedValue({});
const mockCreateConvMutateAsync = vi.fn().mockResolvedValue({});
const mockUpdateConvMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteConvMutateAsync = vi.fn().mockResolvedValue({});

beforeEach(() => {
	vi.clearAllMocks();

	mockUseSession.mockReturnValue({
		data: { user: { id: "u1" }, session: { id: "s1" } },
		isPending: false,
	});
	mockUseQuantityUnit.mockReturnValue({
		data: mockKilogram,
		isLoading: false,
		error: null,
	});
	mockUseQuantityUnits.mockReturnValue({
		data: [mockKilogram, mockGram],
	});
	mockUseUpdateQuantityUnit.mockReturnValue({
		mutateAsync: mockUpdateMutateAsync,
		isPending: false,
	});
	mockUseDeleteQuantityUnit.mockReturnValue({
		mutateAsync: mockDeleteMutateAsync,
		isPending: false,
	});
	mockUseUnitConversions.mockReturnValue({
		data: [mockConversion],
	});
	mockUseCreateUnitConversion.mockReturnValue({
		mutateAsync: mockCreateConvMutateAsync,
		isPending: false,
	});
	mockUseUpdateUnitConversion.mockReturnValue({
		mutateAsync: mockUpdateConvMutateAsync,
		isPending: false,
	});
	mockUseDeleteUnitConversion.mockReturnValue({
		mutateAsync: mockDeleteConvMutateAsync,
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

describe("QuantityUnitDetail", () => {
	describe("authentication", () => {
		it("redirects to /sign-in when session is null", () => {
			mockUseSession.mockReturnValue({ data: null, isPending: false });

			renderPage();

			expect(mockNavigate).toHaveBeenCalledWith({ to: "/sign-in" });
		});
	});

	describe("error states", () => {
		it("shows 'Quantity unit not found' on error", () => {
			mockUseQuantityUnit.mockReturnValue({
				data: null,
				isLoading: false,
				error: new Error("Not found"),
			});

			renderPage();

			expect(screen.getByText("Quantity unit not found")).toBeDefined();
		});
	});

	describe("view mode", () => {
		it("displays quantity unit details", () => {
			renderPage();

			expect(screen.getByText("Kilogram")).toBeDefined();
			expect(screen.getByText("kg")).toBeDefined();
		});

		it("displays conversions in view mode", () => {
			renderPage();

			expect(screen.getByText("Conversions")).toBeDefined();
			expect(
				screen.getByText(
					(content) => content.includes("Gram (g)") && content.includes("1000"),
				),
			).toBeDefined();
		});

		it("shows empty state when no conversions", () => {
			mockUseUnitConversions.mockReturnValue({ data: [] });

			renderPage();

			expect(screen.getByText("No conversions for this unit.")).toBeDefined();
		});

		it("deletes a conversion in view mode", async () => {
			renderPage();

			const deleteButtons = screen.getAllByTitle("Delete conversion");
			fireEvent.click(deleteButtons[0]);

			await waitFor(() => {
				expect(mockDeleteConvMutateAsync).toHaveBeenCalledWith("c1");
			});
		});
	});

	describe("edit flow", () => {
		it("shows edit form and saves changes", async () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Edit"));

			expect(screen.getByText("Edit quantity unit")).toBeDefined();

			const nameInput = screen.getByDisplayValue("Kilogram");
			fireEvent.change(nameInput, { target: { value: "Kilogramme" } });

			fireEvent.click(screen.getByText("Save changes"));

			await waitFor(() => {
				expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
					name: "Kilogramme",
					abbreviation: "kg",
				});
			});
		});

		it("creates a conversion in edit mode", async () => {
			renderPage();

			fireEvent.click(screen.getByTitle("Edit"));

			const comboboxes = screen.getAllByTestId("combobox");
			fireEvent.change(comboboxes[0], { target: { value: "2" } });

			const factorInput = screen.getByPlaceholderText("Factor");
			fireEvent.change(factorInput, { target: { value: "500" } });

			const addButtons = screen.getAllByText("Add");
			fireEvent.click(addButtons[0]);

			await waitFor(() => {
				expect(mockCreateConvMutateAsync).toHaveBeenCalledWith({
					fromUnitId: "1",
					toUnitId: "2",
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
				screen.getByText("Delete this quantity unit? This cannot be undone."),
			).toBeDefined();

			fireEvent.click(screen.getByText("Cancel"));

			expect(
				screen.queryByText("Delete this quantity unit? This cannot be undone."),
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
					to: "/quantity-units",
				});
			});
		});
	});
});
