import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeRecipe, makeSession } from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	recipe: {},
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

// Import after mocks are set up
const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/recipes/index");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/recipes/", () => {
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

	it("returns 200 with empty array when user has no recipes", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest();

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the user's recipes", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const recipes = [
			makeRecipe(),
			makeRecipe({ id: "recipe-2", name: "Waffles" }),
		];
		mockWhere.mockResolvedValue(recipes);
		const request = makeGetRequest();

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
		expect(data[0].name).toBe("Pancakes");
		expect(data[1].name).toBe("Waffles");
	});
});

describe("POST /api/recipes/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/recipes", { name: "Pancakes" });

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 400 when name is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/recipes", {});

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Name is required" });
	});

	it("returns 201 with the created recipe", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeRecipe();
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/recipes", {
			name: "Pancakes",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.name).toBe("Pancakes");
	});

	it("sets userId from session, not from request body", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeRecipe({ userId: session.user.id });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/recipes", {
			name: "Pancakes",
			userId: "attacker-id",
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.userId).toBe(session.user.id);
		expect(data.userId).not.toBe("attacker-id");
	});
});
