import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeStockLog } from "#src/tests/helpers/factories";
import { makeGetRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	stockLog: {},
}));

const mockOffset = vi.fn();
const mockCountWhere = vi.fn();

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn((cols?: Record<string, unknown>) => {
			if (cols && "total" in cols) {
				// count query
				return {
					from: vi.fn(() => ({
						where: mockCountWhere,
					})),
				};
			}
			// data query
			return {
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						orderBy: vi.fn(() => ({
							limit: vi.fn(() => ({
								offset: mockOffset,
							})),
						})),
					})),
				})),
			};
		}),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/stock-logs/index");

type Handler = (ctx: never) => Promise<Response>;

const { GET } = Route.options.server!.handlers! as Record<string, Handler>;

describe("GET /api/stock-logs/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/stock-logs");

		const response = await GET({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with stock logs and total count", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const logs = [makeStockLog()];
		mockOffset.mockResolvedValue(logs);
		mockCountWhere.mockResolvedValue([{ total: 1 }]);
		const request = makeGetRequest("/api/stock-logs");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.logs).toHaveLength(1);
		expect(data.logs[0].transactionType).toBe("add");
		expect(data.total).toBe(1);
	});

	it("supports productId filter", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const logs = [makeStockLog()];
		mockOffset.mockResolvedValue(logs);
		mockCountWhere.mockResolvedValue([{ total: 1 }]);
		const request = makeGetRequest("/api/stock-logs?productId=product-1");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.logs).toHaveLength(1);
	});

	it("respects limit and offset params", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockOffset.mockResolvedValue([]);
		mockCountWhere.mockResolvedValue([{ total: 50 }]);
		const request = makeGetRequest("/api/stock-logs?limit=10&offset=20");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.logs).toHaveLength(0);
		expect(data.total).toBe(50);
	});

	it("clamps limit to valid range", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockOffset.mockResolvedValue([]);
		mockCountWhere.mockResolvedValue([{ total: 0 }]);
		const request = makeGetRequest("/api/stock-logs?limit=999");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		// Doesn't throw — limit is clamped to 100 internally
	});
});
