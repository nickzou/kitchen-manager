import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	makeWebhookDelivery,
	makeWebhookEndpoint,
} from "#src/tests/helpers/factories";

vi.mock("#src/db/schema", () => ({
	webhookEndpoint: {},
	webhookDelivery: {},
}));

const mockSelectWhere = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateWhere = vi.fn();
const mockInnerJoinWhere = vi.fn();

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockSelectWhere,
				innerJoin: vi.fn(() => ({
					where: mockInnerJoinWhere,
				})),
			})),
		})),
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: mockInsertReturning,
			})),
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: mockUpdateWhere,
			})),
		})),
	},
}));

const fetchSpy = vi.spyOn(globalThis, "fetch");

const { dispatchWebhook, processWebhookRetries } = await import(
	"#src/lib/webhooks"
);

describe("dispatchWebhook", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("does not throw when called", () => {
		mockSelectWhere.mockResolvedValue([]);
		expect(() =>
			dispatchWebhook("user-1", "stock.entry.created", { id: "s1" }),
		).not.toThrow();
	});

	it("sends POST with signature to matching endpoints", async () => {
		const endpoint = makeWebhookEndpoint();
		mockSelectWhere.mockResolvedValue([endpoint]);
		const delivery = makeWebhookDelivery();
		mockInsertReturning.mockResolvedValue([delivery]);
		fetchSpy.mockResolvedValue(new Response("ok", { status: 200 }));
		mockUpdateWhere.mockResolvedValue([]);

		dispatchWebhook("user-1", "stock.entry.created", { id: "s1" });

		// Wait for async internals
		await new Promise((r) => setTimeout(r, 50));

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, opts] = fetchSpy.mock.calls[0];
		expect(url).toBe("https://example.com/webhook");
		expect(opts?.method).toBe("POST");
		expect(opts?.headers).toHaveProperty("X-Webhook-Signature");
	});

	it("marks delivery as failed when fetch errors", async () => {
		const endpoint = makeWebhookEndpoint();
		mockSelectWhere.mockResolvedValue([endpoint]);
		const delivery = makeWebhookDelivery();
		mockInsertReturning.mockResolvedValue([delivery]);
		fetchSpy.mockRejectedValue(new Error("Network error"));
		mockUpdateWhere.mockResolvedValue([]);

		dispatchWebhook("user-1", "stock.entry.created", { id: "s1" });

		await new Promise((r) => setTimeout(r, 50));

		expect(mockUpdateWhere).toHaveBeenCalled();
	});
});

describe("processWebhookRetries", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns zero stats when no retries pending", async () => {
		mockInnerJoinWhere.mockResolvedValue([]);

		const stats = await processWebhookRetries();

		expect(stats).toEqual({
			processed: 0,
			succeeded: 0,
			failed: 0,
			suspended: 0,
		});
	});

	it("retries and marks delivery as success", async () => {
		const endpoint = makeWebhookEndpoint();
		const delivery = makeWebhookDelivery({
			status: "failed",
			attempt: 1,
			nextRetryAt: new Date("2020-01-01"),
		});
		mockInnerJoinWhere.mockResolvedValue([{ delivery, endpoint }]);
		fetchSpy.mockResolvedValue(new Response("ok", { status: 200 }));
		mockUpdateWhere.mockResolvedValue([]);

		const stats = await processWebhookRetries();

		expect(stats.processed).toBe(1);
		expect(stats.succeeded).toBe(1);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it("increments failCount after max attempts and suspends at threshold", async () => {
		const endpoint = makeWebhookEndpoint({ failCount: 9 });
		const delivery = makeWebhookDelivery({
			status: "failed",
			attempt: 2,
			nextRetryAt: new Date("2020-01-01"),
		});
		mockInnerJoinWhere.mockResolvedValue([{ delivery, endpoint }]);
		fetchSpy.mockResolvedValue(new Response("error", { status: 500 }));
		mockUpdateWhere.mockResolvedValue([]);

		const stats = await processWebhookRetries();

		expect(stats.processed).toBe(1);
		expect(stats.failed).toBe(1);
		expect(stats.suspended).toBe(1);
	});
});
