import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeProduct, makeSession } from "#/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#/tests/helpers/request-builders";

vi.mock("#/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#/db/schema", () => ({
	product: {},
}));

const mockWhere = vi.fn();
const mockReturning = vi.fn();

vi.mock("#/db", () => ({
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

// Import after mocks are set up
const { getAuthSession } = await import("#/lib/auth-session");
const { Route } = await import("#/routes/api/products/index");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/products/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest();

		const response = await GET({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with empty array when user has no products", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest();

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the user's products", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const products = [
			makeProduct(),
			makeProduct({ id: "product-2", name: "Eggs" }),
		];
		mockWhere.mockResolvedValue(products);
		const request = makeGetRequest();

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
		expect(data[0].name).toBe("Milk");
		expect(data[1].name).toBe("Eggs");
	});
});

describe("POST /api/products/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/products", { name: "Milk" });

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 201 with the created product", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeProduct();
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/products", {
			name: "Milk",
			category: "Dairy",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.name).toBe("Milk");
	});

	it("sets userId from session, not from request body", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeProduct({ userId: session.user.id });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/products", {
			name: "Milk",
			userId: "attacker-id",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.userId).toBe(session.user.id);
		expect(data.userId).not.toBe("attacker-id");
	});

	it("converts expirationDate string to Date", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeProduct({ expirationDate: new Date("2025-12-31") });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/products", {
			name: "Milk",
			expirationDate: "2025-12-31",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
	});

	it("handles missing expirationDate as null", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeProduct({ expirationDate: null });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/products", {
			name: "Milk",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.expirationDate).toBeNull();
	});
});
