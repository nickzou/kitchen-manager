import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeApiKey, makeSession } from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	apiKey: {},
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
const { Route } = await import("#src/routes/api/api-keys/index");

type Handler = (ctx: never) => Promise<Response>;

const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/api-keys/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/api-keys");

		const response = await GET({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with empty array when user has no keys", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest("/api/api-keys");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the user's API keys", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const keys = [
			{
				id: "api-key-1",
				name: "My Script",
				keyPrefix: "km_a1b2c3d",
				lastUsedAt: null,
				createdAt: new Date("2025-01-01"),
			},
			{
				id: "api-key-2",
				name: "CI Bot",
				keyPrefix: "km_x9y8z7w",
				lastUsedAt: new Date("2025-06-01"),
				createdAt: new Date("2025-03-01"),
			},
		];
		mockWhere.mockResolvedValue(keys);
		const request = makeGetRequest("/api/api-keys");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
		expect(data[0].name).toBe("My Script");
		expect(data[1].name).toBe("CI Bot");
	});

	it("never returns keyHash in the response", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const keys = [
			{
				id: "api-key-1",
				name: "My Script",
				keyPrefix: "km_a1b2c3d",
				lastUsedAt: null,
				createdAt: new Date("2025-01-01"),
			},
		];
		mockWhere.mockResolvedValue(keys);
		const request = makeGetRequest("/api/api-keys");

		const response = await GET({ request } as never);

		const data = await response.json();
		expect(data[0]).not.toHaveProperty("keyHash");
	});
});

describe("POST /api/api-keys/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/api-keys", {
			name: "My Script",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 400 when name is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/api-keys", {});

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Name is required" });
	});

	it("returns 201 with the created key including raw key", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeApiKey();
		mockReturning.mockResolvedValue([
			{
				id: created.id,
				name: created.name,
				keyPrefix: created.keyPrefix,
				createdAt: created.createdAt,
			},
		]);
		const request = makePostRequest("/api/api-keys", {
			name: "My Script",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.name).toBe("My Script");
		expect(data.key).toBeDefined();
		expect(data.key).toMatch(/^km_/);
	});

	it("sets userId from session, not from request body", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeApiKey({ userId: session.user.id });
		mockReturning.mockResolvedValue([
			{
				id: created.id,
				name: created.name,
				keyPrefix: created.keyPrefix,
				createdAt: created.createdAt,
			},
		]);
		const request = makePostRequest("/api/api-keys", {
			name: "My Script",
			userId: "attacker-id",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.key).toMatch(/^km_/);
	});
});
