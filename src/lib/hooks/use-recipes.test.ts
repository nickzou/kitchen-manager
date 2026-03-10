import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCreateRecipe,
	useDeleteRecipe,
	useRecipe,
	useRecipes,
	useUpdateRecipe,
} from "./use-recipes";

const mockRecipes = [
	{
		id: "1",
		name: "Pancakes",
		description: "Fluffy pancakes",
		servings: 4,
		prepTime: 10,
		cookTime: 15,
		instructions: "Mix and cook",
		categoryId: null,
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
				json: () => Promise.resolve(mockRecipes),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useRecipes", () => {
	it("calls GET /api/recipes and returns data", async () => {
		const { result } = renderHook(() => useRecipes(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/recipes");
		expect(result.current.data).toEqual(mockRecipes);
	});
});

describe("useRecipe", () => {
	it("calls GET /api/recipes/:id and returns data", async () => {
		const single = mockRecipes[0];
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(single),
		} as Response);

		const { result } = renderHook(() => useRecipe("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/recipes/1");
		expect(result.current.data).toEqual(single);
	});
});

describe("useCreateRecipe", () => {
	it("calls POST /api/recipes with input", async () => {
		const created = { ...mockRecipes[0], id: "2", name: "Waffles" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateRecipe(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				name: "Waffles",
				description: "Crispy waffles",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/recipes", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Waffles", description: "Crispy waffles" }),
		});
	});
});

describe("useUpdateRecipe", () => {
	it("calls PUT /api/recipes/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({ ...mockRecipes[0], name: "Belgian Waffles" }),
		} as Response);

		const { result } = renderHook(() => useUpdateRecipe("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({ name: "Belgian Waffles" }),
		);

		expect(fetch).toHaveBeenCalledWith("/api/recipes/1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Belgian Waffles" }),
		});
	});
});

describe("useDeleteRecipe", () => {
	it("calls DELETE /api/recipes/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteRecipe(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("1"));

		expect(fetch).toHaveBeenCalledWith("/api/recipes/1", {
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

		const { result } = renderHook(() => useRecipes(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Failed to fetch recipes");
	});
});
