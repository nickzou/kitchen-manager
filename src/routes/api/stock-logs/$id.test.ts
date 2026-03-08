import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeStockLog } from "#/tests/helpers/factories";
import {
	makeDeleteRequest,
	makeGetRequest,
	makePutRequest,
} from "#/tests/helpers/request-builders";

vi.mock("#/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#/db/schema", () => ({
	stockLog: {},
}));

const mockSelectWhere = vi.fn();
const mockUpdateReturning = vi.fn();
const mockDeleteReturning = vi.fn();

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
		delete: vi.fn(() => ({
			where: vi.fn(() => ({
				returning: mockDeleteReturning,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#/lib/auth-session");
const { Route } = await import("#/routes/api/stock-logs/$id");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const h = Route.options.server!.handlers! as Record<string, Handler>;
const { GET, PUT, DELETE: DELETE_HANDLER } = h;
const params = { id: "stock-log-1" };

describe("GET /api/stock-logs/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/stock-logs/stock-log-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockSelectWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/stock-logs/stock-log-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the stock log", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const found = makeStockLog();
		mockSelectWhere.mockResolvedValue([found]);
		const request = makeGetRequest("/api/stock-logs/stock-log-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.transactionType).toBe("add");
		expect(data.quantity).toBe("10");
	});
});

describe("PUT /api/stock-logs/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest("/api/stock-logs/stock-log-1", {
			quantity: "5",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest("/api/stock-logs/stock-log-1", {
			quantity: "5",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with updated stock log", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeStockLog({ quantity: "5" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/stock-logs/stock-log-1", {
			quantity: "5",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.quantity).toBe("5");
	});
});

describe("DELETE /api/stock-logs/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest("/api/stock-logs/stock-log-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest("/api/stock-logs/stock-log-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with deleted stock log", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const deleted = makeStockLog();
		mockDeleteReturning.mockResolvedValue([deleted]);
		const request = makeDeleteRequest("/api/stock-logs/stock-log-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.transactionType).toBe("add");
	});
});
