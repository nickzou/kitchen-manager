import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useConsumeStock,
	useCreateStockEntry,
	useDeleteStockEntry,
	useStockEntries,
	useUpdateStockEntry,
} from "./use-stock-entries";

const mockStockEntries = [
	{
		id: "se1",
		productId: "p1",
		quantity: "10",
		expirationDate: "2026-04-01T00:00:00Z",
		purchaseDate: "2026-03-01T00:00:00Z",
		price: "5.99",
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
				json: () => Promise.resolve(mockStockEntries),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useStockEntries", () => {
	it("calls GET /api/stock-entries and returns data", async () => {
		const { result } = renderHook(() => useStockEntries(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/stock-entries");
		expect(result.current.data).toEqual(mockStockEntries);
	});

	it("calls GET /api/stock-entries with productId filter", async () => {
		const { result } = renderHook(() => useStockEntries("p1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/stock-entries?productId=p1");
	});
});

describe("useCreateStockEntry", () => {
	it("calls POST /api/stock-entries with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockStockEntries[0]),
		} as Response);

		const { result } = renderHook(() => useCreateStockEntry(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				productId: "p1",
				quantity: "10",
				price: "5.99",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/stock-entries", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				productId: "p1",
				quantity: "10",
				price: "5.99",
			}),
		});
	});
});

describe("useUpdateStockEntry", () => {
	it("calls PUT /api/stock-entries/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ ...mockStockEntries[0], quantity: "8" }),
		} as Response);

		const { result } = renderHook(() => useUpdateStockEntry("se1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync({ quantity: "8" }));

		expect(fetch).toHaveBeenCalledWith("/api/stock-entries/se1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ quantity: "8" }),
		});
	});
});

describe("useDeleteStockEntry", () => {
	it("calls DELETE /api/stock-entries/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteStockEntry(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("se1"));

		expect(fetch).toHaveBeenCalledWith("/api/stock-entries/se1", {
			method: "DELETE",
		});
	});
});

describe("useConsumeStock", () => {
	it("calls POST /api/stock-entries/consume with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useConsumeStock(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() =>
			result.current.mutateAsync({
				stockEntryId: "se1",
				quantity: "3",
			}),
		);

		expect(fetch).toHaveBeenCalledWith("/api/stock-entries/consume", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ stockEntryId: "se1", quantity: "3" }),
		});
	});
});

describe("error handling", () => {
	it("throws when response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Not found" }),
		} as Response);

		const { result } = renderHook(() => useStockEntries(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Failed to fetch stock entries");
	});
});
