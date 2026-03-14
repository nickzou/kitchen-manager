import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCreateProductUnitConversion,
	useDeleteProductUnitConversion,
	useProductUnitConversions,
	useUpdateProductUnitConversion,
} from "./use-product-unit-conversions";

const mockConversions = [
	{
		id: "puc-1",
		productId: "product-1",
		fromUnitId: "unit-1",
		toUnitId: "unit-2",
		factor: "120",
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
				json: () => Promise.resolve(mockConversions),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useProductUnitConversions", () => {
	it("calls GET /api/products/:id/unit-conversions and returns data", async () => {
		const { result } = renderHook(
			() => useProductUnitConversions("product-1"),
			{ wrapper: createTestWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith(
			"/api/products/product-1/unit-conversions",
		);
		expect(result.current.data).toEqual(mockConversions);
	});

	it("does not fetch when productId is empty", async () => {
		const { result } = renderHook(() => useProductUnitConversions(""), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));

		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("useCreateProductUnitConversion", () => {
	it("calls POST /api/products/:id/unit-conversions", async () => {
		const created = mockConversions[0];
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(
			() => useCreateProductUnitConversion("product-1"),
			{ wrapper: createTestWrapper() },
		);

		await result.current.mutateAsync({
			fromUnitId: "unit-1",
			toUnitId: "unit-2",
			factor: "120",
		});

		expect(fetch).toHaveBeenCalledWith(
			"/api/products/product-1/unit-conversions",
			expect.objectContaining({ method: "POST" }),
		);
	});
});

describe("useUpdateProductUnitConversion", () => {
	it("calls PUT /api/products/:id/unit-conversions/:conversionId", async () => {
		const updated = { ...mockConversions[0], factor: "150" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(updated),
		} as Response);

		const { result } = renderHook(
			() => useUpdateProductUnitConversion("product-1", "puc-1"),
			{ wrapper: createTestWrapper() },
		);

		await result.current.mutateAsync({ factor: "150" });

		expect(fetch).toHaveBeenCalledWith(
			"/api/products/product-1/unit-conversions/puc-1",
			expect.objectContaining({ method: "PUT" }),
		);
	});
});

describe("useDeleteProductUnitConversion", () => {
	it("calls DELETE /api/products/:id/unit-conversions/:conversionId", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockConversions[0]),
		} as Response);

		const { result } = renderHook(
			() => useDeleteProductUnitConversion("product-1"),
			{ wrapper: createTestWrapper() },
		);

		await result.current.mutateAsync("puc-1");

		expect(fetch).toHaveBeenCalledWith(
			"/api/products/product-1/unit-conversions/puc-1",
			expect.objectContaining({ method: "DELETE" }),
		);
	});
});
