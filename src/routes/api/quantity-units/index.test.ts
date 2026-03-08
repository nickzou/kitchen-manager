import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQuantityUnit, makeSession } from "#/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#/tests/helpers/request-builders";

vi.mock("#/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#/db/schema", () => ({
	quantityUnit: {},
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

const { getAuthSession } = await import("#/lib/auth-session");
const { Route } = await import("#/routes/api/quantity-units/index");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/quantity-units/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/quantity-units");

		const response = await GET({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with empty array when user has no units", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/quantity-units");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the user's quantity units", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const units = [
			makeQuantityUnit(),
			makeQuantityUnit({ id: "unit-2", name: "Grams", abbreviation: "g" }),
		];
		mockWhere.mockResolvedValue(units);
		const request = makeGetRequest("/api/quantity-units");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
		expect(data[0].name).toBe("Pieces");
		expect(data[1].name).toBe("Grams");
	});
});

describe("POST /api/quantity-units/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/quantity-units", {
			name: "Pieces",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 201 with the created quantity unit", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeQuantityUnit();
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/quantity-units", {
			name: "Pieces",
			abbreviation: "pcs",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.name).toBe("Pieces");
		expect(data.abbreviation).toBe("pcs");
	});

	it("sets userId from session", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeQuantityUnit({ userId: session.user.id });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/quantity-units", {
			name: "Pieces",
			userId: "attacker-id",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.userId).toBe(session.user.id);
	});
});
