import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	makeProductUnitConversion,
	makeSession,
} from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	productUnitConversion: {},
}));

const mockWhere = vi.fn();
const mockReturning = vi.fn();

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockWhere,
			})),
		})),
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: mockReturning,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import(
	"#src/routes/api/products/$id/unit-conversions/index"
);

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;
const params = { id: "product-1" };

describe("GET /api/products/:id/unit-conversions/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/products/product-1/unit-conversions");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with empty array when no conversions", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/products/product-1/unit-conversions");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with product unit conversions", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const conversions = [
			makeProductUnitConversion(),
			makeProductUnitConversion({ id: "puc-2", factor: "200" }),
		];
		mockWhere.mockResolvedValue(conversions);
		const request = makeGetRequest("/api/products/product-1/unit-conversions");

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
		expect(data[0].factor).toBe("120");
		expect(data[1].factor).toBe("200");
	});
});

describe("POST /api/products/:id/unit-conversions/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest(
			"/api/products/product-1/unit-conversions",
			{
				fromUnitId: "unit-1",
				toUnitId: "unit-2",
				factor: "120",
			},
		);

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 201 with the created conversion", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeProductUnitConversion();
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest(
			"/api/products/product-1/unit-conversions",
			{
				fromUnitId: "unit-1",
				toUnitId: "unit-2",
				factor: "120",
			},
		);

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.fromUnitId).toBe("unit-1");
		expect(data.toUnitId).toBe("unit-2");
		expect(data.factor).toBe("120");
	});

	it("sets productId from route param and userId from session", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeProductUnitConversion({
			productId: "product-1",
			userId: session.user.id,
		});
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest(
			"/api/products/product-1/unit-conversions",
			{
				fromUnitId: "unit-1",
				toUnitId: "unit-2",
				factor: "120",
				productId: "attacker-product",
				userId: "attacker-id",
			},
		);

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.productId).toBe("product-1");
		expect(data.userId).toBe(session.user.id);
	});
});
