import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeStockEntry } from "#/tests/helpers/factories";
import {
	makeDeleteRequest,
	makeGetRequest,
	makePutRequest,
} from "#/tests/helpers/request-builders";

vi.mock("#/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#/db/schema", () => ({
	stockEntry: {},
	stockLog: {},
}));

const mockSelectWhere = vi.fn();
const mockUpdateReturning = vi.fn();
const mockTxSelectWhere = vi.fn();
const mockTxDeleteReturning = vi.fn();
const mockTxInsertValues = vi.fn(() => ({}));

vi.mock("#/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockSelectWhere,
			})),
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: mockUpdateReturning,
				})),
			})),
		})),
		transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
			const tx = {
				select: vi.fn(() => ({
					from: vi.fn(() => ({
						where: mockTxSelectWhere,
					})),
				})),
				insert: vi.fn(() => ({
					values: mockTxInsertValues,
				})),
				delete: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: mockTxDeleteReturning,
					})),
				})),
			};
			return fn(tx);
		}),
	},
}));

const { getAuthSession } = await import("#/lib/auth-session");
const { Route } = await import("#/routes/api/stock-entries/$id");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const h = Route.options.server!.handlers! as Record<string, Handler>;
const { GET, PUT, DELETE: DELETE_HANDLER } = h;
const params = { id: "stock-entry-1" };

describe("GET /api/stock-entries/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/stock-entries/stock-entry-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockSelectWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/stock-entries/stock-entry-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with stock entry", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const found = makeStockEntry();
		mockSelectWhere.mockResolvedValue([found]);
		const request = makeGetRequest("/api/stock-entries/stock-entry-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.quantity).toBe("10");
	});
});

describe("PUT /api/stock-entries/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest("/api/stock-entries/stock-entry-1", {
			quantity: "20",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest("/api/stock-entries/stock-entry-1", {
			quantity: "20",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with updated stock entry", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeStockEntry({ quantity: "20" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/stock-entries/stock-entry-1", {
			quantity: "20",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.quantity).toBe("20");
	});
});

describe("DELETE /api/stock-entries/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest("/api/stock-entries/stock-entry-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockTxSelectWhere.mockResolvedValue([]);
		const request = makeDeleteRequest("/api/stock-entries/stock-entry-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 and creates remove log for remaining quantity", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const entry = makeStockEntry({ quantity: "5" });
		mockTxSelectWhere.mockResolvedValue([entry]);
		mockTxDeleteReturning.mockResolvedValue([entry]);
		const request = makeDeleteRequest("/api/stock-entries/stock-entry-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.quantity).toBe("5");
	});
});
