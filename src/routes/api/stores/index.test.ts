import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeStore } from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	store: {},
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
const { Route } = await import("#src/routes/api/stores/index");

type Handler = (ctx: never) => Promise<Response>;

const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/stores/", () => {
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

	it("returns 200 with empty array when user has no stores", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest();

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the user's stores", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const stores = [
			makeStore(),
			makeStore({ id: "store-2", name: "Trader Joe's" }),
		];
		mockWhere.mockResolvedValue(stores);
		const request = makeGetRequest();

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
		expect(data[0].name).toBe("Whole Foods");
		expect(data[1].name).toBe("Trader Joe's");
	});
});

describe("POST /api/stores/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/stores", { name: "Whole Foods" });

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 400 when name is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/stores", {});

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Name is required" });
	});

	it("returns 201 with the created store", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeStore();
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/stores", {
			name: "Whole Foods",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.name).toBe("Whole Foods");
	});

	it("sets userId from session, not from request body", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeStore({ userId: session.user.id });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/stores", {
			name: "Whole Foods",
			userId: "attacker-id",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.userId).toBe(session.user.id);
		expect(data.userId).not.toBe("attacker-id");
	});
});
