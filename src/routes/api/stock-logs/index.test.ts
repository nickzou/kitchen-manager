import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeStockLog } from "#/tests/helpers/factories";
import { makeGetRequest } from "#/tests/helpers/request-builders";

vi.mock("#/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#/db/schema", () => ({
	stockLog: {},
}));

const mockWhere = vi.fn();

vi.mock("#/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockWhere,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#/lib/auth-session");
const { Route } = await import("#/routes/api/stock-logs/index");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
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

	it("returns 200 with stock logs", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const logs = [makeStockLog()];
		mockWhere.mockResolvedValue(logs);
		const request = makeGetRequest("/api/stock-logs");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(1);
		expect(data[0].transactionType).toBe("add");
	});

	it("supports productId filter", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const logs = [makeStockLog()];
		mockWhere.mockResolvedValue(logs);
		const request = makeGetRequest("/api/stock-logs?productId=product-1");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(1);
	});
});
