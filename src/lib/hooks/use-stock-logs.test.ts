import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestWrapper } from "#src/tests/helpers/test-wrapper";
import {
	useDeleteStockLog,
	useStockLogs,
	useUpdateStockLog,
} from "./use-stock-logs";

const mockStockLogs = [
	{
		id: "sl1",
		stockEntryId: "se1",
		productId: "p1",
		transactionType: "add" as const,
		quantity: "10",
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
				json: () => Promise.resolve(mockStockLogs),
			}),
		),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useStockLogs", () => {
	it("calls GET /api/stock-logs and returns data", async () => {
		const { result } = renderHook(() => useStockLogs(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/stock-logs");
		expect(result.current.data).toEqual(mockStockLogs);
	});

	it("calls GET /api/stock-logs with productId filter", async () => {
		const { result } = renderHook(() => useStockLogs("p1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetch).toHaveBeenCalledWith("/api/stock-logs?productId=p1");
	});
});

describe("useUpdateStockLog", () => {
	it("calls PUT /api/stock-logs/:id with input", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ ...mockStockLogs[0], quantity: "5" }),
		} as Response);

		const { result } = renderHook(() => useUpdateStockLog("sl1"), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync({ quantity: "5" }));

		expect(fetch).toHaveBeenCalledWith("/api/stock-logs/sl1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ quantity: "5" }),
		});
	});
});

describe("useDeleteStockLog", () => {
	it("calls DELETE /api/stock-logs/:id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		} as Response);

		const { result } = renderHook(() => useDeleteStockLog(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => result.current.mutateAsync("sl1"));

		expect(fetch).toHaveBeenCalledWith("/api/stock-logs/sl1", {
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

		const { result } = renderHook(() => useStockLogs(), {
			wrapper: createTestWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Failed to fetch stock logs");
	});
});
