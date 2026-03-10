import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeUnitConversion } from "#/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#/tests/helpers/request-builders";

vi.mock("#/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#/db/schema", () => ({
	unitConversion: {},
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
const { Route } = await import("#/routes/api/unit-conversions/index");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/unit-conversions/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/unit-conversions");

		const response = await GET({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with empty array when user has no conversions", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/unit-conversions");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the user's unit conversions", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const conversions = [
			makeUnitConversion(),
			makeUnitConversion({ id: "conversion-2", factor: "16" }),
		];
		mockWhere.mockResolvedValue(conversions);
		const request = makeGetRequest("/api/unit-conversions");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
		expect(data[0].factor).toBe("1000");
		expect(data[1].factor).toBe("16");
	});
});

describe("POST /api/unit-conversions/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/unit-conversions", {
			fromUnitId: "unit-1",
			toUnitId: "unit-2",
			factor: "1000",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 201 with the created unit conversion", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeUnitConversion();
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/unit-conversions", {
			fromUnitId: "unit-1",
			toUnitId: "unit-2",
			factor: "1000",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.fromUnitId).toBe("unit-1");
		expect(data.toUnitId).toBe("unit-2");
		expect(data.factor).toBe("1000");
	});

	it("sets userId from session", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeUnitConversion({ userId: session.user.id });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/unit-conversions", {
			fromUnitId: "unit-1",
			toUnitId: "unit-2",
			factor: "1000",
			userId: "attacker-id",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.userId).toBe(session.user.id);
	});
});
