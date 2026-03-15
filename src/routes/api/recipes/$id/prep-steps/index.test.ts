import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeRecipePrepStep, makeSession } from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	recipePrepStep: {},
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
const { Route } = await import("#src/routes/api/recipes/$id/prep-steps/index");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;
const params = { id: "recipe-1" };

describe("GET /api/recipes/:id/prep-steps/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest();

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with empty array when recipe has no prep steps", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest();

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the recipe's prep steps", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const steps = [
			makeRecipePrepStep(),
			makeRecipePrepStep({ id: "prep-step-2", leadTimeMinutes: 30 }),
		];
		mockWhere.mockResolvedValue(steps);
		const request = makeGetRequest();

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
	});
});

describe("POST /api/recipes/:id/prep-steps/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/recipes/recipe-1/prep-steps", {
			description: "Defrost chicken",
			leadTimeMinutes: 480,
		});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 400 when description is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/recipes/recipe-1/prep-steps", {
			leadTimeMinutes: 480,
		});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Description is required",
		});
	});

	it("returns 400 when leadTimeMinutes is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/recipes/recipe-1/prep-steps", {
			description: "Defrost chicken",
		});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Lead time is required",
		});
	});

	it("returns 201 with the created prep step", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeRecipePrepStep();
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/recipes/recipe-1/prep-steps", {
			description: "Defrost chicken",
			leadTimeMinutes: 480,
		});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.description).toBe("Defrost chicken");
	});

	it("sets userId from session, not from request body", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeRecipePrepStep({ userId: session.user.id });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/recipes/recipe-1/prep-steps", {
			description: "Defrost chicken",
			leadTimeMinutes: 480,
			userId: "attacker-id",
		});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.userId).toBe(session.user.id);
		expect(data.userId).not.toBe("attacker-id");
	});
});
