import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	makeSession,
	makeShoppingListItem,
} from "#src/tests/helpers/factories";
import {
	makeDeleteRequest,
	makeGetRequest,
	makePutRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	shoppingListItem: {},
}));

const mockSelectWhere = vi.fn();
const mockUpdateReturning = vi.fn();
const mockDeleteReturning = vi.fn();
const mockUpdateSet = vi.fn(() => ({
	where: vi.fn(() => ({ returning: mockUpdateReturning })),
}));

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockSelectWhere,
			})),
		})),
		update: vi.fn(() => ({
			set: mockUpdateSet,
		})),
		delete: vi.fn(() => ({
			where: vi.fn(() => ({
				returning: mockDeleteReturning,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/shopping-list-items/$id");

type Handler = (ctx: never) => Promise<Response>;
const handlers = Route.options.server!.handlers! as Record<string, Handler>;
const { GET, PUT, DELETE: DELETE_HANDLER } = handlers;
const params = { id: "shopping-list-item-1" };

describe("GET /api/shopping-list-items/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/shopping-list-items/x");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(401);
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockSelectWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/shopping-list-items/x");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(404);
	});

	it("returns 200 with the item", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockSelectWhere.mockResolvedValue([makeShoppingListItem()]);
		const request = makeGetRequest("/api/shopping-list-items/x");
		const response = await GET({ request, params } as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.id).toBe("shopping-list-item-1");
	});
});

describe("PUT /api/shopping-list-items/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest("/api/shopping-list-items/x", {
			quantity: "5",
		});
		const response = await PUT({ request, params } as never);
		expect(response.status).toBe(401);
	});

	it("returns 404 when item not found / not owned by user", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest("/api/shopping-list-items/x", {
			quantity: "5",
		});
		const response = await PUT({ request, params } as never);
		expect(response.status).toBe(404);
	});

	it("updates only the provided fields", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([
			makeShoppingListItem({ quantity: "5" }),
		]);
		const request = makePutRequest("/api/shopping-list-items/x", {
			quantity: "5",
		});
		await PUT({ request, params } as never);
		expect(mockUpdateSet).toHaveBeenCalledWith({ quantity: "5" });
	});

	it("does not include unrelated fields the body didn't provide", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([makeShoppingListItem()]);
		const request = makePutRequest("/api/shopping-list-items/x", {
			productId: "p-2",
		});
		await PUT({ request, params } as never);
		expect(mockUpdateSet).toHaveBeenCalledWith({ productId: "p-2" });
	});
});

describe("DELETE /api/shopping-list-items/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest("/api/shopping-list-items/x");
		const response = await DELETE_HANDLER({ request, params } as never);
		expect(response.status).toBe(401);
	});

	it("returns 404 when item not found / not owned by user", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest("/api/shopping-list-items/x");
		const response = await DELETE_HANDLER({ request, params } as never);
		expect(response.status).toBe(404);
	});

	it("returns 200 with the deleted item", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([makeShoppingListItem()]);
		const request = makeDeleteRequest("/api/shopping-list-items/x");
		const response = await DELETE_HANDLER({ request, params } as never);
		expect(response.status).toBe(200);
	});
});
