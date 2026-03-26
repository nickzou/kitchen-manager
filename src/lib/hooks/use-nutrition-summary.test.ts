import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import { useNutritionSummary } from "./use-nutrition-summary";

const mockSummary = {
	"2025-03-24": { calories: 1800, protein: 80, fat: 60, carbs: 200 },
	"2025-03-25": { calories: 2100, protein: 90, fat: 70, carbs: 230 },
};

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockSummary),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useNutritionSummary", () => {
	it("fetches nutrition summary for date range", async () => {
		const { result } = renderHook(
			() => useNutritionSummary("2025-03-24", "2025-03-30"),
			{ wrapper: createTestWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith(
			"/api/meal-plan-entries/nutrition-summary?startDate=2025-03-24&endDate=2025-03-30",
		);
		expect(result.current.data).toEqual(mockSummary);
	});

	it("throws when response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Unauthorized" }),
		} as Response);

		const { result } = renderHook(
			() => useNutritionSummary("2025-03-24", "2025-03-30"),
			{ wrapper: createTestWrapper() },
		);

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Failed to fetch nutrition summary",
		);
	});
});
