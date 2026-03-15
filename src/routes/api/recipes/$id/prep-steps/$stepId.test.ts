import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeRecipePrepStep, makeSession } from "#src/tests/helpers/factories";
import {
	makeDeleteRequest,
	makePutRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	recipePrepStep: {},
}));

const mockUpdateReturning = vi.fn();
const mockDeleteReturning = vi.fn();

vi.mock("#src/db", () => ({
	db: {
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
	"#src/routes/api/recipes/$id/prep-steps/$stepId"
);

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file — handlers are guaranteed to exist
const h = Route.options.server!.handlers! as Record<string, Handler>;
const { PUT, DELETE: DELETE_HANDLER } = h;
const params = { id: "recipe-1", stepId: "prep-step-1" };

describe("PUT /api/recipes/:id/prep-steps/:stepId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest(
			"/api/recipes/recipe-1/prep-steps/prep-step-1",
			{ description: "Updated step" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when prep step not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/prep-steps/prep-step-1",
			{ description: "Updated step" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the updated prep step", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeRecipePrepStep({ description: "Updated step" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/prep-steps/prep-step-1",
			{ description: "Updated step" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.description).toBe("Updated step");
	});
});

describe("DELETE /api/recipes/:id/prep-steps/:stepId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest(
			"/api/recipes/recipe-1/prep-steps/prep-step-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when prep step not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest(
			"/api/recipes/recipe-1/prep-steps/prep-step-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the deleted prep step", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const deleted = makeRecipePrepStep();
		mockDeleteReturning.mockResolvedValue([deleted]);
		const request = makeDeleteRequest(
			"/api/recipes/recipe-1/prep-steps/prep-step-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.recipeId).toBe("recipe-1");
	});
});
