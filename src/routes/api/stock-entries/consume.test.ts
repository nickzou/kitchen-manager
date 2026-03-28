import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeStockEntry } from "#src/tests/helpers/factories";
import { makePostRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	stockEntry: {},
	stockLog: {},
}));

const mockTxSelectWhere = vi.fn();
const mockTxUpdateReturning = vi.fn();
const mockTxDeleteReturning = vi.fn();
const mockTxInsertValues = vi.fn(() => ({}));

vi.mock("#src/db", () => ({
	db: {
		transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
			const tx = {
				select: vi.fn(() => ({
					from: vi.fn(() => ({
						where: mockTxSelectWhere,
					})),
				})),
				update: vi.fn(() => ({
					set: vi.fn(() => ({
						where: vi.fn(() => ({
							returning: mockTxUpdateReturning,
						})),
					})),
				})),
				delete: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: mockTxDeleteReturning,
					})),
				})),
				insert: vi.fn(() => ({
					values: mockTxInsertValues,
				})),
			};
			return fn(tx);
		}),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/stock-entries/consume");

type Handler = (ctx: never) => Promise<Response>;

const { POST } = Route.options.server!.handlers! as Record<string, Handler>;

describe("POST /api/stock-entries/consume", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/stock-entries/consume", {
			stockEntryId: "stock-entry-1",
			quantity: "3",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 400 when stockEntryId or quantity missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/stock-entries/consume", {});

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "stockEntryId and quantity are required",
		});
	});

	it("returns 400 when quantity is not positive", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/stock-entries/consume", {
			stockEntryId: "stock-entry-1",
			quantity: "-1",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Quantity must be positive",
		});
	});

	it("returns 404 when stock entry not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockTxSelectWhere.mockResolvedValue([]);
		const request = makePostRequest("/api/stock-entries/consume", {
			stockEntryId: "stock-entry-1",
			quantity: "3",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 400 when consuming more than available", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockTxSelectWhere.mockResolvedValue([makeStockEntry({ quantity: "2" })]);
		const request = makePostRequest("/api/stock-entries/consume", {
			stockEntryId: "stock-entry-1",
			quantity: "5",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Cannot consume 5, only 2 available",
		});
	});

	it("deletes entry when consumed to zero", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const entry = makeStockEntry({ quantity: "5" });
		mockTxSelectWhere.mockResolvedValue([entry]);
		mockTxDeleteReturning.mockResolvedValue([entry]);
		const request = makePostRequest("/api/stock-entries/consume", {
			stockEntryId: "stock-entry-1",
			quantity: "5",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.quantity).toBe("0");
	});

	it("returns 200 with updated entry after consuming", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockTxSelectWhere.mockResolvedValue([makeStockEntry({ quantity: "10" })]);
		const updated = makeStockEntry({ quantity: "7" });
		mockTxUpdateReturning.mockResolvedValue([updated]);
		const request = makePostRequest("/api/stock-entries/consume", {
			stockEntryId: "stock-entry-1",
			quantity: "3",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.quantity).toBe("7");
	});
});
