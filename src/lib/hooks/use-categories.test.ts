import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCreateProductCategory,
	useCreateRecipeCategory,
	useDeleteProductCategory,
	useDeleteRecipeCategory,
	useProductCategories,
	useProductCategory,
	useRecipeCategories,
	useRecipeCategory,
	useUpdateProductCategory,
	useUpdateRecipeCategory,
} from "./use-categories";

const mockProductCategories = [
	{
		id: "1",
		name: "Vegetables",
		description: "Fresh vegetables",
		userId: "u1",
		createdAt: "2026-03-01T00:00:00Z",
		updatedAt: "2026-03-01T00:00:00Z",
	},
];

const mockRecipeCategories = [
	{
		id: "2",
		name: "Quick Meals",
		description: "Fast recipes",
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
				json: () => Promise.resolve(mockProductCategories),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useProductCategories", () => {
	it("calls GET /api/product-categories and returns data", async () => {
		const { result } = renderHook(() => useProductCategories(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/product-categories");
		expect(result.current.data).toEqual(mockProductCategories);
	});
});

describe("useProductCategory", () => {
	it("calls GET /api/product-categories/:id and returns data", async () => {
		const single = mockProductCategories[0];
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(single),
		} as Response);

		const { result } = renderHook(() => useProductCategory("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/product-categories/1");
		expect(result.current.data).toEqual(single);
	});
});

describe("useCreateProductCategory", () => {
	it("calls POST /api/product-categories with input", async () => {
		const created = { ...mockProductCategories[0], id: "2", name: "Fruits" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateProductCategory(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				name: "Fruits",
				description: "Fresh fruits",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/product-categories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Fruits", description: "Fresh fruits" }),
		});
	});
});

describe("useUpdateProductCategory", () => {
	it("calls PUT /api/product-categories/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					...mockProductCategories[0],
					name: "Root Vegetables",
				}),
		} as Response);

		const { result } = renderHook(() => useUpdateProductCategory("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({ name: "Root Vegetables" }),
		);

		expect(fetch).toHaveBeenCalledWith("/api/product-categories/1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Root Vegetables" }),
		});
	});
});

describe("useDeleteProductCategory", () => {
	it("calls DELETE /api/product-categories/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteProductCategory(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("1"));

		expect(fetch).toHaveBeenCalledWith("/api/product-categories/1", {
			method: "DELETE",
		});
	});
});

describe("useRecipeCategories", () => {
	it("calls GET /api/recipe-categories and returns data", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockRecipeCategories),
		} as Response);

		const { result } = renderHook(() => useRecipeCategories(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/recipe-categories");
		expect(result.current.data).toEqual(mockRecipeCategories);
	});
});

describe("useRecipeCategory", () => {
	it("calls GET /api/recipe-categories/:id and returns data", async () => {
		const single = mockRecipeCategories[0];
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(single),
		} as Response);

		const { result } = renderHook(() => useRecipeCategory("2"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/recipe-categories/2");
		expect(result.current.data).toEqual(single);
	});
});

describe("useCreateRecipeCategory", () => {
	it("calls POST /api/recipe-categories with input", async () => {
		const created = { ...mockRecipeCategories[0], id: "3", name: "Dinner" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateRecipeCategory(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				name: "Dinner",
				description: "Dinner recipes",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/recipe-categories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Dinner", description: "Dinner recipes" }),
		});
	});
});

describe("useUpdateRecipeCategory", () => {
	it("calls PUT /api/recipe-categories/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({ ...mockRecipeCategories[0], name: "Dinner" }),
		} as Response);

		const { result } = renderHook(() => useUpdateRecipeCategory("2"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync({ name: "Dinner" }));

		expect(fetch).toHaveBeenCalledWith("/api/recipe-categories/2", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Dinner" }),
		});
	});
});

describe("useDeleteRecipeCategory", () => {
	it("calls DELETE /api/recipe-categories/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteRecipeCategory(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("2"));

		expect(fetch).toHaveBeenCalledWith("/api/recipe-categories/2", {
			method: "DELETE",
		});
	});
});

describe("error handling", () => {
	it("throws when product categories response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Not found" }),
		} as Response);

		const { result } = renderHook(() => useProductCategories(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Failed to fetch product categories",
		);
	});

	it("throws when recipe categories response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Not found" }),
		} as Response);

		const { result } = renderHook(() => useRecipeCategories(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Failed to fetch recipe categories",
		);
	});
});
