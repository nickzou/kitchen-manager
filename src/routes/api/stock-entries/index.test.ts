import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeStockEntry } from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	stockEntry: {},
	stockLog: {},
}));

const mockWhere = vi.fn();
const mockTxInsertReturning = vi.fn();
const mockTxInsertValues2 = vi.fn(() => ({}));

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockWhere,
			})),
		})),
		transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
			const tx = {
				insert: vi.fn(() => ({
					values: vi.fn((vals: unknown) => {
						// First insert call (stockEntry) returns with returning()
						// Second insert call (stockLog) doesn't need returning
						if (
							typeof vals === "object" &&
							vals !== null &&
							"transactionType" in vals
						) {
							return { returning: mockTxInsertValues2 };
						}
						return { returning: mockTxInsertReturning };
					}),
				})),
			};
			return fn(tx);
		}),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/stock-entries/index");

type Handler = (ctx: never) => Promise<Response>;

const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/stock-entries/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/stock-entries");

		const response = await GET({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with stock entries", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const entries = [makeStockEntry()];
		mockWhere.mockResolvedValue(entries);
		const request = makeGetRequest("/api/stock-entries");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(1);
		expect(data[0].quantity).toBe("10");
	});

	it("supports productId filter", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const entries = [makeStockEntry()];
		mockWhere.mockResolvedValue(entries);
		const request = makeGetRequest("/api/stock-entries?productId=product-1");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(1);
	});
});

describe("POST /api/stock-entries/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/stock-entries", {
			productId: "product-1",
			quantity: "5",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 201 and creates entry with add log", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeStockEntry({ quantity: "5" });
		mockTxInsertReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/stock-entries", {
			productId: "product-1",
			quantity: "5",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.quantity).toBe("5");
		expect(data.productId).toBe("product-1");
	});
});
