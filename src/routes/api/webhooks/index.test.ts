import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeWebhookEndpoint } from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePostRequest,
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

const mockWhere = vi.fn();
const mockInsertReturning = vi.fn();

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockWhere,
			})),
		})),
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: mockInsertReturning,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/webhooks/index");

type Handler = (ctx: never) => Promise<Response>;

// biome-ignore lint/style/noNonNullAssertion: test file
const { GET, POST } = Route.options.server!.handlers! as Record<
	string,
	Handler
>;

describe("GET /api/webhooks/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/webhooks");

		const response = await GET({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns 200 with webhooks", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const { secret: _, ...endpoint } = makeWebhookEndpoint();
		mockWhere.mockResolvedValue([endpoint]);
		const request = makeGetRequest("/api/webhooks");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toHaveLength(1);
		expect(data[0].name).toBe("My Webhook");
		expect(data[0].secret).toBeUndefined();
	});
});

describe("POST /api/webhooks/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePostRequest("/api/webhooks", {
			name: "Test",
			url: "https://example.com",
			events: ["stock.entry.created"],
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(401);
	});

	it("returns 400 for missing fields", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/webhooks", { name: "Test" });

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid events", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/webhooks", {
			name: "Test",
			url: "https://example.com",
			events: ["invalid.event"],
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid event names" });
	});

	it("returns 400 for invalid URL", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const request = makePostRequest("/api/webhooks", {
			name: "Test",
			url: "not-a-url",
			events: ["stock.entry.created"],
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid URL" });
	});

	it("returns 201 and includes secret on creation", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const created = {
			id: "wh-1",
			name: "Test",
			url: "https://example.com",
			events: ["stock.entry.created"],
			status: "active",
			createdAt: new Date("2025-01-01"),
		};
		mockInsertReturning.mockResolvedValue([created]);
		const request = makePostRequest("/api/webhooks", {
			name: "Test",
			url: "https://example.com",
			events: ["stock.entry.created"],
		});

		const response = await POST({ request } as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.name).toBe("Test");
		expect(data.secret).toMatch(/^whsec_/);
	});
});
