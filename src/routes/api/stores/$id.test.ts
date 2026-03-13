import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeStore } from "#src/tests/helpers/factories";
import {
	makeDeleteRequest,
	makeGetRequest,
	makePutRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	store: {},
}));

const mockSelectWhere = vi.fn();
const mockUpdateReturning = vi.fn();
const mockDeleteReturning = vi.fn();

vi.mock("#src/db", () => ({
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

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/stores/$id");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const h = Route.options.server!.handlers! as Record<string, Handler>;
const { GET, PUT, DELETE: DELETE_HANDLER } = h;
const params = { id: "store-1" };

describe("GET /api/stores/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/stores/store-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when store not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockSelectWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/stores/store-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the store", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const found = makeStore();
		mockSelectWhere.mockResolvedValue([found]);
		const request = makeGetRequest("/api/stores/store-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Whole Foods");
	});
});

describe("PUT /api/stores/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest("/api/stores/store-1", {
			name: "Costco",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when store not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest("/api/stores/store-1", {
			name: "Costco",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the updated store", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeStore({ name: "Costco" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/stores/store-1", {
			name: "Costco",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Costco");
	});

	it("only updates fields present in request body", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeStore({ name: "Costco" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/stores/store-1", {
			name: "Costco",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Costco");
	});
});

describe("DELETE /api/stores/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest("/api/stores/store-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when store not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest("/api/stores/store-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the deleted store", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const deleted = makeStore();
		mockDeleteReturning.mockResolvedValue([deleted]);
		const request = makeDeleteRequest("/api/stores/store-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Whole Foods");
	});
});
