import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCreateRecipePrepStep,
	useDeleteRecipePrepStep,
	useRecipePrepSteps,
	useUpdateRecipePrepStep,
} from "./use-recipe-prep-steps";

const mockPrepSteps = [
	{
		id: "ps-1",
		recipeId: "recipe-1",
		description: "Defrost chicken",
		leadTimeMinutes: 480,
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
				json: () => Promise.resolve(mockPrepSteps),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useRecipePrepSteps", () => {
	it("calls GET /api/recipes/:id/prep-steps and returns data", async () => {
		const { result } = renderHook(() => useRecipePrepSteps("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/recipes/recipe-1/prep-steps");
		expect(result.current.data).toEqual(mockPrepSteps);
	});
});

describe("useCreateRecipePrepStep", () => {
	it("calls POST /api/recipes/:id/prep-steps with input", async () => {
		const created = { ...mockPrepSteps[0], id: "ps-2" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateRecipePrepStep("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				description: "Defrost chicken",
				leadTimeMinutes: 480,
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/recipes/recipe-1/prep-steps", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				description: "Defrost chicken",
				leadTimeMinutes: 480,
			}),
		});
	});
});

describe("useUpdateRecipePrepStep", () => {
	it("calls PUT /api/recipes/:id/prep-steps/:stepId with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({ ...mockPrepSteps[0], description: "Marinate" }),
		} as Response);

		const { result } = renderHook(() => useUpdateRecipePrepStep("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({ id: "ps-1", description: "Marinate" }),
		);

		expect(fetch).toHaveBeenCalledWith(
			"/api/recipes/recipe-1/prep-steps/ps-1",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ description: "Marinate" }),
			},
		);
	});
});

describe("useDeleteRecipePrepStep", () => {
	it("calls DELETE /api/recipes/:id/prep-steps/:stepId", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteRecipePrepStep("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("ps-1"));

		expect(fetch).toHaveBeenCalledWith(
			"/api/recipes/recipe-1/prep-steps/ps-1",
			{ method: "DELETE" },
		);
	});
});

describe("error handling", () => {
	it("throws when response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Not found" }),
		} as Response);

		const { result } = renderHook(() => useRecipePrepSteps("recipe-1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Failed to fetch recipe prep steps",
		);
	});
});
