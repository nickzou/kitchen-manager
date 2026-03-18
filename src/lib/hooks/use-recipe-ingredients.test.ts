import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCreateRecipeIngredient,
	useDeleteRecipeIngredient,
	useRecipeIngredients,
	useUpdateRecipeIngredient,
} from "./use-recipe-ingredients";

const mockIngredients = [
	{
		id: "ri-1",
		recipeId: "recipe-1",
		productId: "product-1",
		quantity: "2",
		quantityUnitId: null,
		notes: null,
		groupName: null,
		sortOrder: 0,
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
				json: () => Promise.resolve(mockIngredients),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useRecipeIngredients", () => {
	it("calls GET /api/recipes/:id/ingredients and returns data", async () => {
		const { result } = renderHook(() => useRecipeIngredients("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/recipes/recipe-1/ingredients");
		expect(result.current.data).toEqual(mockIngredients);
	});
});

describe("useCreateRecipeIngredient", () => {
	it("calls POST /api/recipes/:id/ingredients with input", async () => {
		const created = { ...mockIngredients[0], id: "ri-2" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateRecipeIngredient("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				quantity: "2",
				productId: "product-1",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/recipes/recipe-1/ingredients", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ quantity: "2", productId: "product-1" }),
		});
	});
});

describe("useUpdateRecipeIngredient", () => {
	it("calls PUT /api/recipes/:id/ingredients/:ingredientId with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ ...mockIngredients[0], quantity: "5" }),
		} as Response);

		const { result } = renderHook(() => useUpdateRecipeIngredient("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({ id: "ri-1", quantity: "5" }),
		);

		expect(fetch).toHaveBeenCalledWith(
			"/api/recipes/recipe-1/ingredients/ri-1",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ quantity: "5" }),
			},
		);
	});
});

describe("useDeleteRecipeIngredient", () => {
	it("calls DELETE /api/recipes/:id/ingredients/:ingredientId", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteRecipeIngredient("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("ri-1"));

		expect(fetch).toHaveBeenCalledWith(
			"/api/recipes/recipe-1/ingredients/ri-1",
			{ method: "DELETE" },
		);
	});
});

function createSpyWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const spy = vi.spyOn(queryClient, "invalidateQueries");
	return { wrapper: createTestWrapper(queryClient), spy };
}

describe("recipe-availability invalidation", () => {
	it("useCreateRecipeIngredient invalidates recipe-availability on success", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockIngredients[0]),
		} as Response);

		const { wrapper, spy } = createSpyWrapper();
		const { result } = renderHook(() => useCreateRecipeIngredient("recipe-1"), {
			wrapper,
		});

		await waitFor(() =>
			result.current.mutateAsync({
				quantity: "2",
				productId: "product-1",
			}),
		);

		expect(spy).toHaveBeenCalledWith({
			queryKey: ["recipe-availability"],
		});
	});

	it("useUpdateRecipeIngredient invalidates recipe-availability on success", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ ...mockIngredients[0], quantity: "5" }),
		} as Response);

		const { wrapper, spy } = createSpyWrapper();
		const { result } = renderHook(() => useUpdateRecipeIngredient("recipe-1"), {
			wrapper,
		});

		await waitFor(() =>
			result.current.mutateAsync({ id: "ri-1", quantity: "5" }),
		);

		expect(spy).toHaveBeenCalledWith({
			queryKey: ["recipe-availability"],
		});
	});

	it("useDeleteRecipeIngredient invalidates recipe-availability on success", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { wrapper, spy } = createSpyWrapper();
		const { result } = renderHook(() => useDeleteRecipeIngredient("recipe-1"), {
			wrapper,
		});

		await waitFor(() => result.current.mutateAsync("ri-1"));

		expect(spy).toHaveBeenCalledWith({
			queryKey: ["recipe-availability"],
		});
	});
});

describe("error handling", () => {
	it("throws when response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Not found" }),
		} as Response);

		const { result } = renderHook(() => useRecipeIngredients("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Failed to fetch recipe ingredients",
		);
	});
});
