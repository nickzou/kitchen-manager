import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	makeRecipeIngredient,
	makeSession,
} from "#src/tests/helpers/factories";
import {
	makeDeleteRequest,
	makePutRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	recipeIngredient: {},
}));

const mockUpdateReturning = vi.fn();
const mockDeleteReturning = vi.fn();
const mockUpdateSet = vi.fn(() => ({
	where: vi.fn(() => ({ returning: mockUpdateReturning })),
}));

vi.mock("#src/db", () => ({
	db: {
		update: vi.fn(() => ({
			set: mockUpdateSet,
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
	"#src/routes/api/recipes/$id/ingredients/$ingredientId"
);

type Handler = (ctx: never) => Promise<Response>;

const h = Route.options.server!.handlers! as Record<string, Handler>;
const { PUT, DELETE: DELETE_HANDLER } = h;
const params = { id: "recipe-1", ingredientId: "recipe-ingredient-1" };

describe("PUT /api/recipes/:id/ingredients/:ingredientId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ quantity: "5" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when ingredient not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ quantity: "5" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the updated ingredient", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeRecipeIngredient({ quantity: "5" });
		mockUpdateReturning.mockResolvedValue([updated]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ quantity: "5" },
		);

		const response = await PUT({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.quantity).toBe("5");
	});

	it("applies optional: true when toggled on", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([
			makeRecipeIngredient({ optional: true }),
		]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ optional: true },
		);

		await PUT({ request, params } as never);

		expect(mockUpdateSet).toHaveBeenCalledWith({ optional: true });
	});

	it("applies optional: false when toggled off", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([makeRecipeIngredient()]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ optional: false },
		);

		await PUT({ request, params } as never);

		expect(mockUpdateSet).toHaveBeenCalledWith({ optional: false });
	});

	it("does not touch optional when the body omits it", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([makeRecipeIngredient()]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ quantity: "5" },
		);

		await PUT({ request, params } as never);

		expect(mockUpdateSet).toHaveBeenCalledWith(
			expect.not.objectContaining({ optional: expect.anything() }),
		);
	});

	it("applies skipStockDeduction: true when toggled on", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([
			makeRecipeIngredient({ skipStockDeduction: true }),
		]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ skipStockDeduction: true },
		);

		await PUT({ request, params } as never);

		expect(mockUpdateSet).toHaveBeenCalledWith({ skipStockDeduction: true });
	});

	it("applies skipStockDeduction: false when toggled off", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([makeRecipeIngredient()]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ skipStockDeduction: false },
		);

		await PUT({ request, params } as never);

		expect(mockUpdateSet).toHaveBeenCalledWith({ skipStockDeduction: false });
	});

	it("does not touch skipStockDeduction when the body omits it", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([makeRecipeIngredient()]);
		const request = makePutRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
			{ quantity: "5" },
		);

		await PUT({ request, params } as never);

		expect(mockUpdateSet).toHaveBeenCalledWith(
			expect.not.objectContaining({ skipStockDeduction: expect.anything() }),
		);
	});
});

describe("DELETE /api/recipes/:id/ingredients/:ingredientId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when ingredient not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with the deleted ingredient", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const deleted = makeRecipeIngredient();
		mockDeleteReturning.mockResolvedValue([deleted]);
		const request = makeDeleteRequest(
			"/api/recipes/recipe-1/ingredients/recipe-ingredient-1",
		);

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.recipeId).toBe("recipe-1");
	});
});
