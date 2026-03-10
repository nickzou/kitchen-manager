import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCreateProduct,
	useDeleteProduct,
	useProduct,
	useProducts,
	useUpdateProduct,
} from "./use-products";

const mockProducts = [
	{
		id: "1",
		name: "Tomatoes",
		categoryId: "c1",
		description: null,
		image: null,
		quantityUnitId: null,
		minStockAmount: "0",
		defaultExpirationDays: null,
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
				json: () => Promise.resolve(mockProducts),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useProducts", () => {
	it("calls GET /api/products and returns data", async () => {
		const { result } = renderHook(() => useProducts(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/products");
		expect(result.current.data).toEqual(mockProducts);
	});
});

describe("useProduct", () => {
	it("calls GET /api/products/:id and returns data", async () => {
		const single = mockProducts[0];
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(single),
		} as Response);

		const { result } = renderHook(() => useProduct("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/products/1");
		expect(result.current.data).toEqual(single);
	});
});

describe("useCreateProduct", () => {
	it("calls POST /api/products with input", async () => {
		const created = { ...mockProducts[0], id: "2", name: "Carrots" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateProduct(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({ name: "Carrots", categoryId: "c1" }),
		);

		expect(fetch).toHaveBeenCalledWith("/api/products", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Carrots", categoryId: "c1" }),
		});
	});
});

describe("useUpdateProduct", () => {
	it("calls PUT /api/products/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({ ...mockProducts[0], name: "Cherry Tomatoes" }),
		} as Response);

		const { result } = renderHook(() => useUpdateProduct("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({ name: "Cherry Tomatoes" }),
		);

		expect(fetch).toHaveBeenCalledWith("/api/products/1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Cherry Tomatoes" }),
		});
	});
});

describe("useDeleteProduct", () => {
	it("calls DELETE /api/products/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteProduct(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("1"));

		expect(fetch).toHaveBeenCalledWith("/api/products/1", {
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

		const { result } = renderHook(() => useProducts(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Failed to fetch products");
	});
});
