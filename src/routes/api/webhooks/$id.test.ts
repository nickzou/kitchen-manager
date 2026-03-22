import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeWebhookEndpoint } from "#src/tests/helpers/factories";
import {
	makeDeleteRequest,
	makePutRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/lib/webhooks", () => ({
	WEBHOOK_EVENTS: [
		"stock.entry.created",
		"stock.entry.updated",
		"stock.entry.deleted",
		"stock.entry.consumed",
		"meal_plan.entry.created",
		"meal_plan.entry.updated",
		"meal_plan.entry.deleted",
		"meal_plan.entry.cooked",
		"meal_plan.entry.uncooked",
		"meal_slot.created",
		"meal_slot.updated",
		"meal_slot.deleted",
	],
}));

vi.mock("#src/db/schema", () => ({
	webhookEndpoint: {},
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
const { Route } = await import("#src/routes/api/webhooks/$id");

type Handler = (ctx: never) => Promise<Response>;

const { PUT, DELETE } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("PUT /api/webhooks/$id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest("/api/webhooks/wh-1", { name: "Updated" });

		const response = await PUT({ request, params: { id: "wh-1" } } as never);

		expect(response.status).toBe(401);
	});

	it("returns 404 when webhook not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockUpdateReturning.mockResolvedValue([]);
		const request = makePutRequest("/api/webhooks/wh-1", { name: "Updated" });

		const response = await PUT({ request, params: { id: "wh-1" } } as never);

		expect(response.status).toBe(404);
	});

	it("returns 200 on successful update", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const { secret: _, ...endpoint } = makeWebhookEndpoint({
			name: "Updated",
		});
		mockUpdateReturning.mockResolvedValue([endpoint]);
		const request = makePutRequest("/api/webhooks/wh-1", { name: "Updated" });

		const response = await PUT({ request, params: { id: "wh-1" } } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe("Updated");
	});

	it("returns 400 for invalid events", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePutRequest("/api/webhooks/wh-1", {
			events: ["bad.event"],
		});

		const response = await PUT({ request, params: { id: "wh-1" } } as never);

		expect(response.status).toBe(400);
	});
});

describe("DELETE /api/webhooks/$id", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeDeleteRequest("/api/webhooks/wh-1");

		const response = await DELETE({
			request,
			params: { id: "wh-1" },
		} as never);

		expect(response.status).toBe(401);
	});

	it("returns 404 when webhook not found", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([]);
		const request = makeDeleteRequest("/api/webhooks/wh-1");

		const response = await DELETE({
			request,
			params: { id: "wh-1" },
		} as never);

		expect(response.status).toBe(404);
	});

	it("returns 200 on successful delete", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockDeleteReturning.mockResolvedValue([makeWebhookEndpoint()]);
		const request = makeDeleteRequest("/api/webhooks/wh-1");

		const response = await DELETE({
			request,
			params: { id: "wh-1" },
		} as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
	});
});
