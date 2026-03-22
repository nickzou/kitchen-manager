import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeApiKey, makeSession } from "#src/tests/helpers/factories";
import { makeDeleteRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	apiKey: {},
}));

const mockDeleteReturning = vi.fn();

vi.mock("#src/db", () => ({
	db: {
		delete: vi.fn(() => ({
			where: vi.fn(() => ({
				returning: mockDeleteReturning,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/api-keys/$id");

type Handler = (ctx: never) => Promise<Response>;

const h = Route.options.server!.handlers! as Record<string, Handler>;
const { DELETE: DELETE_HANDLER } = h;
const params = { id: "api-key-1" };

describe("DELETE /api/api-keys/:id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest("/api/api-keys/api-key-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 404 when key not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest("/api/api-keys/api-key-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});

	it("returns 200 with success when key is deleted", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const deleted = makeApiKey();
		mockDeleteReturning.mockResolvedValue([deleted]);
		const request = makeDeleteRequest("/api/api-keys/api-key-1");

		const response = await DELETE_HANDLER({ request, params } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ success: true });
	});
});
