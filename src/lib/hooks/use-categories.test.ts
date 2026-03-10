import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCategories,
	useCategory,
	useCreateCategory,
	useDeleteCategory,
	useUpdateCategory,
} from "./use-categories";

const mockCategories = [
	{
		id: "1",
		name: "Vegetables",
		description: "Fresh vegetables",
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
				json: () => Promise.resolve(mockCategories),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useCategories", () => {
	it("calls GET /api/categories and returns data", async () => {
		const { result } = renderHook(() => useCategories(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/categories");
		expect(result.current.data).toEqual(mockCategories);
	});
});

describe("useCategory", () => {
	it("calls GET /api/categories/:id and returns data", async () => {
		const single = mockCategories[0];
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(single),
		} as Response);

		const { result } = renderHook(() => useCategory("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/categories/1");
		expect(result.current.data).toEqual(single);
	});
});

describe("useCreateCategory", () => {
	it("calls POST /api/categories with input", async () => {
		const created = { ...mockCategories[0], id: "2", name: "Fruits" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateCategory(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				name: "Fruits",
				description: "Fresh fruits",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/categories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Fruits", description: "Fresh fruits" }),
		});
	});
});

describe("useUpdateCategory", () => {
	it("calls PUT /api/categories/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({ ...mockCategories[0], name: "Root Vegetables" }),
		} as Response);

		const { result } = renderHook(() => useUpdateCategory("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({ name: "Root Vegetables" }),
		);

		expect(fetch).toHaveBeenCalledWith("/api/categories/1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Root Vegetables" }),
		});
	});
});

describe("useDeleteCategory", () => {
	it("calls DELETE /api/categories/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteCategory(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("1"));

		expect(fetch).toHaveBeenCalledWith("/api/categories/1", {
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

		const { result } = renderHook(() => useCategories(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Failed to fetch categories");
	});
});
