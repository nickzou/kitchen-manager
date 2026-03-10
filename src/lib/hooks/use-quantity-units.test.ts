import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCreateQuantityUnit,
	useDeleteQuantityUnit,
	useQuantityUnit,
	useQuantityUnits,
	useUpdateQuantityUnit,
} from "./use-quantity-units";

const mockQuantityUnits = [
	{
		id: "1",
		name: "Kilograms",
		abbreviation: "kg",
		userId: "u1",
		createdAt: "2026-03-01T00:00:00Z",
		updatedAt: "2026-03-01T00:00:00Z",
	},
];

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockQuantityUnits),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useQuantityUnits", () => {
	it("calls GET /api/quantity-units and returns data", async () => {
		const { result } = renderHook(() => useQuantityUnits(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/quantity-units");
		expect(result.current.data).toEqual(mockQuantityUnits);
	});
});

describe("useQuantityUnit", () => {
	it("calls GET /api/quantity-units/:id and returns data", async () => {
		const single = mockQuantityUnits[0];
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(single),
		} as Response);

		const { result } = renderHook(() => useQuantityUnit("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/quantity-units/1");
		expect(result.current.data).toEqual(single);
	});
});

describe("useCreateQuantityUnit", () => {
	it("calls POST /api/quantity-units with input", async () => {
		const created = { ...mockQuantityUnits[0], id: "2", name: "Liters" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateQuantityUnit(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				name: "Liters",
				abbreviation: "L",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/quantity-units", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Liters", abbreviation: "L" }),
		});
	});
});

describe("useUpdateQuantityUnit", () => {
	it("calls PUT /api/quantity-units/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ ...mockQuantityUnits[0], name: "Grams" }),
		} as Response);

		const { result } = renderHook(() => useUpdateQuantityUnit("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync({ name: "Grams" }));

		expect(fetch).toHaveBeenCalledWith("/api/quantity-units/1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Grams" }),
		});
	});
});

describe("useDeleteQuantityUnit", () => {
	it("calls DELETE /api/quantity-units/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteQuantityUnit(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("1"));

		expect(fetch).toHaveBeenCalledWith("/api/quantity-units/1", {
			method: "DELETE",
		});
	});
});

describe("error handling", () => {
	it("throws when response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Not found" }),
		} as Response);

		const { result } = renderHook(() => useQuantityUnits(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Failed to fetch quantity units",
		);
	});
});
