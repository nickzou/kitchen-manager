import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	makeRecipeIngredient,
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
	recipeIngredient: {},
}));

const mockWhere = vi.fn();
const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockWhere,
			})),
		})),
		insert: vi.fn(() => ({
			values: mockValues,
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/recipes/$id/ingredients/index");

type Handler = (ctx: never) => Promise<Response>;

const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;
const params = { id: "recipe-1" };

describe("GET /api/recipes/:id/ingredients/", () => {
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

	it("returns 200 with empty array when recipe has no ingredients", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const request = makeGetRequest();

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it("returns 200 with the recipe's ingredients", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const ingredients = [
			makeRecipeIngredient(),
			makeRecipeIngredient({ id: "recipe-ingredient-2", quantity: "3" }),
		];
		mockWhere.mockResolvedValue(ingredients);
		const request = makeGetRequest();

		const response = await GET({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(2);
	});
});

describe("POST /api/recipes/:id/ingredients/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/recipes/recipe-1/ingredients", {
			quantity: "2",
		});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 400 when quantity is missing", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/recipes/recipe-1/ingredients", {});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Quantity is required" });
	});

	it("returns 201 with the created ingredient", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = makeRecipeIngredient();
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/recipes/recipe-1/ingredients", {
			quantity: "2",
			productId: "product-1",
		});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.quantity).toBe("2");
	});

	it("sets userId from session, not from request body", async () => {
		const session = makeSession();
		vi.mocked(getAuthSession).mockResolvedValue(session as never);
		const created = makeRecipeIngredient({ userId: session.user.id });
		mockReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/recipes/recipe-1/ingredients", {
			quantity: "2",
			userId: "attacker-id",
		});

		const response = await POST({ request, params } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.userId).toBe(session.user.id);
		expect(data.userId).not.toBe("attacker-id");
	});

	it("persists optional: true when provided in the body", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockReturning.mockResolvedValue([makeRecipeIngredient({ optional: true })]);
		const request = makePostRequest("/api/recipes/recipe-1/ingredients", {
			quantity: "2",
			productId: "product-1",
			optional: true,
		});

		await POST({ request, params } as never);

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({ optional: true }),
		);
	});

	it("defaults optional to false when the body omits it", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockReturning.mockResolvedValue([makeRecipeIngredient()]);
		const request = makePostRequest("/api/recipes/recipe-1/ingredients", {
			quantity: "2",
			productId: "product-1",
		});

		await POST({ request, params } as never);

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({ optional: false }),
		);
	});
});
