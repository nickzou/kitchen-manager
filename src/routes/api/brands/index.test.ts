import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession } from "#src/tests/helpers/factories";
import { makePostRequest } from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	brand: {},
}));

const mockReturning = vi.fn();

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve([])),
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
const { Route } = await import("#src/routes/api/brands/index");

type Handler = (ctx: never) => Promise<Response>;
const { POST } = Route.options.server!.handlers! as Record<string, Handler>;

describe("POST /api/brands/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 409 with a clear message when the brand name already exists", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		// Simulate Postgres unique-violation error
		mockReturning.mockRejectedValue(
			Object.assign(new Error("duplicate key value"), { code: "23505" }),
		);
		const response = await POST({
			request: makePostRequest("/api/brands", { name: "Lactantia" }),
		} as never);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: "A brand with this name already exists",
		});
	});

	it("rethrows non-unique-violation errors", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockReturning.mockRejectedValue(
			Object.assign(new Error("connection lost"), { code: "08006" }),
		);
		await expect(
			POST({
				request: makePostRequest("/api/brands", { name: "Lactantia" }),
			} as never),
		).rejects.toThrow("connection lost");
	});
});
