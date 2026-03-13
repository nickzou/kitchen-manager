import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useCreateStore,
	useDeleteStore,
	useStore,
	useStores,
	useUpdateStore,
} from "./use-stores";

const mockStores = [
	{
		id: "1",
		name: "Whole Foods",
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
				json: () => Promise.resolve(mockStores),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useStores", () => {
	it("calls GET /api/stores and returns data", async () => {
		const { result } = renderHook(() => useStores(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/stores");
		expect(result.current.data).toEqual(mockStores);
	});
});

describe("useStore", () => {
	it("calls GET /api/stores/:id and returns data", async () => {
		const single = mockStores[0];
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(single),
		} as Response);

		const { result } = renderHook(() => useStore("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/stores/1");
		expect(result.current.data).toEqual(single);
	});
});

describe("useCreateStore", () => {
	it("calls POST /api/stores with input", async () => {
		const created = { ...mockStores[0], id: "2", name: "Costco" };
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(created),
		} as Response);

		const { result } = renderHook(() => useCreateStore(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				name: "Costco",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/stores", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Costco" }),
		});
	});
});

describe("useUpdateStore", () => {
	it("calls PUT /api/stores/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({ ...mockStores[0], name: "Whole Foods Market" }),
		} as Response);

		const { result } = renderHook(() => useUpdateStore("1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({ name: "Whole Foods Market" }),
		);

		expect(fetch).toHaveBeenCalledWith("/api/stores/1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Whole Foods Market" }),
		});
	});
});

describe("useDeleteStore", () => {
	it("calls DELETE /api/stores/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteStore(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("1"));

		expect(fetch).toHaveBeenCalledWith("/api/stores/1", {
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

		const { result } = renderHook(() => useStores(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Failed to fetch stores");
	});
});
