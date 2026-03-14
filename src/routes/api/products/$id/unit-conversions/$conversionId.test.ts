import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	makeProductUnitConversion,
	makeSession,
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
	productUnitConversion: {},
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
const { Route } = await import(
	"#src/routes/api/products/$id/unit-conversions/$conversionId"
);

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const h = Route.options.server!.handlers! as Record<string, Handler>;
const { GET, PUT, DELETE: DELETE_HANDLER } = h;
const params = { id: "product-1", conversionId: "puc-1" };

describe("GET /api/products/:id/unit-conversions/:conversionId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest(
			"/api/products/product-1/unit-conversions/puc-1",
		);

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockSelectWhere.mockResolvedValue([]);
		const request = makeGetRequest(
			"/api/products/product-1/unit-conversions/puc-1",
		);

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the conversion", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const found = makeProductUnitConversion();
		mockSelectWhere.mockResolvedValue([found]);
		const request = makeGetRequest(
			"/api/products/product-1/unit-conversions/puc-1",
		);

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.factor).toBe("120");
	});
});

describe("PUT /api/products/:id/unit-conversions/:conversionId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest(
			"/api/products/product-1/unit-conversions/puc-1",
			{ factor: "150" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest(
			"/api/products/product-1/unit-conversions/puc-1",
			{ factor: "150" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with updated conversion", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeProductUnitConversion({ factor: "150" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest(
			"/api/products/product-1/unit-conversions/puc-1",
			{ factor: "150" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.factor).toBe("150");
	});
});

describe("DELETE /api/products/:id/unit-conversions/:conversionId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest(
			"/api/products/product-1/unit-conversions/puc-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest(
			"/api/products/product-1/unit-conversions/puc-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with deleted conversion", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const deleted = makeProductUnitConversion();
		mockDeleteReturning.mockResolvedValue([deleted]);
		const request = makeDeleteRequest(
			"/api/products/product-1/unit-conversions/puc-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.factor).toBe("120");
	});
});
