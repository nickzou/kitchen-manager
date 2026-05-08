import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	makeSession,
	makeShoppingListItem,
} from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	shoppingListItem: {},
}));

const mockOrderBy = vi.fn();
const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					orderBy: mockOrderBy,
				})),
			})),
		})),
		insert: vi.fn(() => ({
			values: mockValues,
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/shopping-list-items/index");

type Handler = (ctx: never) => Promise<Response>;
const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/shopping-list-items/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const response = await GET({ request: makeGetRequest() } as never);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with empty array when user has no items", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockOrderBy.mockResolvedValue([]);
		const response = await GET({ request: makeGetRequest() } as never);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the user's items", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockOrderBy.mockResolvedValue([
			makeShoppingListItem(),
			makeShoppingListItem({ id: "item-2", quantity: "5" }),
		]);
		const response = await GET({ request: makeGetRequest() } as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
		expect(data[1].quantity).toBe("5");
	});
});

describe("POST /api/shopping-list-items/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/shopping-list-items", {
			productId: "p-1",
			quantity: "2",
		});
		const response = await POST({ request } as never);
		expect(response.status).toBe(401);
	});

	it("returns 400 when productId is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/shopping-list-items", {
			quantity: "2",
		});
		const response = await POST({ request } as never);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "productId is required" });
	});

	it("returns 400 when quantity is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/shopping-list-items", {
			productId: "p-1",
		});
		const response = await POST({ request } as never);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "quantity is required" });
	});

	it("returns 201 with the created item", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockReturning.mockResolvedValue([
			makeShoppingListItem({ productId: "p-1", quantity: "3" }),
		]);
		const request = makePostRequest("/api/shopping-list-items", {
			productId: "p-1",
			quantity: "3",
		});
		const response = await POST({ request } as never);
		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.productId).toBe("p-1");
		expect(data.quantity).toBe("3");
	});

	it("sets userId from session, not from request body", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		mockReturning.mockResolvedValue([
			makeShoppingListItem({ userId: session.user.id }),
		]);
		const request = makePostRequest("/api/shopping-list-items", {
			productId: "p-1",
			quantity: "2",
			userId: "attacker-id",
		});
		await POST({ request } as never);
		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({ userId: session.user.id }),
		);
		expect(mockValues).not.toHaveBeenCalledWith(
			expect.objectContaining({ userId: "attacker-id" }),
		);
	});

	it("defaults quantityUnitId to null when not provided", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockReturning.mockResolvedValue([makeShoppingListItem()]);
		const request = makePostRequest("/api/shopping-list-items", {
			productId: "p-1",
			quantity: "2",
		});
		await POST({ request } as never);
		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({ quantityUnitId: null }),
		);
	});
});
