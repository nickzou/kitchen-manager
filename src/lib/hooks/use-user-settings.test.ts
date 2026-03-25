import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import { useUpdateUserSettings, useUserSettings } from "./use-user-settings";

const mockSettings = {
	id: "user-settings-1",
	userId: "user-1",
	advancedMode: false,
	apiEnabled: false,
	webhooksEnabled: false,
	createdAt: "2025-01-01T00:00:00Z",
	updatedAt: "2025-01-01T00:00:00Z",
};

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockSettings),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useUserSettings", () => {
	it("calls GET /api/user-settings and returns data", async () => {
		const { result } = renderHook(() => useUserSettings(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/user-settings");
		expect(result.current.data).toEqual(mockSettings);
	});

	it("throws when response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Unauthorized" }),
		} as Response);

		const { result } = renderHook(() => useUserSettings(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Failed to fetch user settings");
	});
});

describe("useUpdateUserSettings", () => {
	it("calls PUT /api/user-settings with input", async () => {
		const updated = { ...mockSettings, advancedMode: true };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(updated),
		} as Response);

		const { result } = renderHook(() => useUpdateUserSettings(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync({ advancedMode: true }));

		expect(fetch).toHaveBeenCalledWith("/api/user-settings", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ advancedMode: true }),
		});
	});

	it("supports partial updates", async () => {
		const updated = { ...mockSettings, apiEnabled: true };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(updated),
		} as Response);

		const { result } = renderHook(() => useUpdateUserSettings(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync({ apiEnabled: true }));

		expect(fetch).toHaveBeenCalledWith("/api/user-settings", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ apiEnabled: true }),
		});
	});

	it("throws when response is not ok", async () => {
		vi.mocked(fetch).mockImplementation(() =>
			Promise.resolve({
				ok: false,
				json: () => Promise.resolve({ error: "Failed" }),
			} as Response),
		);

		const { result } = renderHook(() => useUpdateUserSettings(), {
			wrapper: createTestWrapper(),
		});

		await expect(
			result.current.mutateAsync({ advancedMode: true }),
		).rejects.toThrow("Failed to update user settings");
	});
});
