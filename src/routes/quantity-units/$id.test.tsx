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
import { createTestWrapper } from "#/tests/helpers/test-wrapper";

const mockNavigate = vi.fn();
const mockUseSession = vi.fn();
const mockUseQuantityUnit = vi.fn();
const mockUseUpdateQuantityUnit = vi.fn();
const mockUseDeleteQuantityUnit = vi.fn();

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
	useUpdateQuantityUnit: (...args: unknown[]) =>
		mockUseUpdateQuantityUnit(...args),
	useDeleteQuantityUnit: (...args: unknown[]) =>
		mockUseDeleteQuantityUnit(...args),
}));

vi.mock("#/lib/utils", () => ({
	cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("#/components/InventorySubNav", () => ({
	default: () => <nav data-testid="inventory-sub-nav" />,
}));

import { Route } from "./$id";

const mockQuantityUnit: QuantityUnit = {
	id: "1",
	name: "Kilogram",
	abbreviation: "kg",
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
	mockUseQuantityUnit.mockReturnValue({
		data: mockQuantityUnit,
		isLoading: false,
		error: null,
	});
	mockUseUpdateQuantityUnit.mockReturnValue({
		mutateAsync: mockUpdateMutateAsync,
		isPending: false,
	});
	mockUseDeleteQuantityUnit.mockReturnValue({
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
