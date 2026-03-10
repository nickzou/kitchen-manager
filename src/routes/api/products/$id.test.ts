import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeProduct, makeSession } from "#src/tests/helpers/factories";
import {
	makeDeleteRequest,
	makeGetRequest,
	makePutRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	product: {},
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
const { Route } = await import("#src/routes/api/products/$id");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const h = Route.options.server!.handlers! as Record<string, Handler>;
const { GET, PUT, DELETE: DELETE_HANDLER } = h;
const params = { id: "product-1" };

describe("GET /api/products/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/products/product-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when product not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockSelectWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/products/product-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the product", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const found = makeProduct();
		mockSelectWhere.mockResolvedValue([found]);
		const request = makeGetRequest("/api/products/product-1");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Milk");
	});
});

describe("PUT /api/products/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest("/api/products/product-1", {
			name: "Oat Milk",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when product not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest("/api/products/product-1", {
			name: "Oat Milk",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the updated product", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeProduct({ name: "Oat Milk" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/products/product-1", {
			name: "Oat Milk",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Oat Milk");
	});

	it("only updates fields present in request body", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeProduct({ name: "Oat Milk" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/products/product-1", {
			name: "Oat Milk",
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Oat Milk");
		expect(data.categoryId).toBeNull();
	});

	it("updates new stock-related fields", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeProduct({
			categoryId: "category-1",
			quantityUnitId: "unit-1",
			minStockAmount: "5",
			defaultExpirationDays: 14,
		});
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/products/product-1", {
			categoryId: "category-1",
			quantityUnitId: "unit-1",
			minStockAmount: "5",
			defaultExpirationDays: 14,
		});

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.categoryId).toBe("category-1");
		expect(data.quantityUnitId).toBe("unit-1");
		expect(data.minStockAmount).toBe("5");
		expect(data.defaultExpirationDays).toBe(14);
	});
});

describe("DELETE /api/products/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest("/api/products/product-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when product not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest("/api/products/product-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the deleted product", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const deleted = makeProduct();
		mockDeleteReturning.mockResolvedValue([deleted]);
		const request = makeDeleteRequest("/api/products/product-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Milk");
	});
});
