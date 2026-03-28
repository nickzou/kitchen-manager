import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSession, makeUserSettings } from "#src/tests/helpers/factories";
import {
	makeGetRequest,
	makePutRequest,
} from "#src/tests/helpers/request-builders";

vi.mock("#src/lib/auth-session", () => ({
	getAuthSession: vi.fn(),
}));

vi.mock("#src/db/schema", () => ({
	userSettings: {},
}));

const mockWhere = vi.fn();
const mockReturning = vi.fn();
const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }));

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
				onConflictDoUpdate: mockOnConflictDoUpdate,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");
const { Route } = await import("#src/routes/api/user-settings/index");

type Handler = (ctx: never) => Promise<Response>;

const { GET, PUT } = Route.options.server!.handlers! as Record<string, Handler>;

describe("GET /api/user-settings/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makeGetRequest("/api/user-settings");

		const response = await GET({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns existing settings", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const settings = makeUserSettings({ advancedMode: true });
		mockWhere.mockResolvedValue([settings]);
		const request = makeGetRequest("/api/user-settings");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.advancedMode).toBe(true);
		expect(data.apiEnabled).toBe(false);
	});

	it("auto-creates settings with defaults for new user", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		mockWhere.mockResolvedValue([]);
		const created = makeUserSettings();
		mockReturning.mockResolvedValue([created]);
		const request = makeGetRequest("/api/user-settings");

		const response = await GET({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.advancedMode).toBe(false);
		expect(data.apiEnabled).toBe(false);
		expect(data.webhooksEnabled).toBe(false);
		expect(data.nutritionEnabled).toBe(false);
	});
});

describe("PUT /api/user-settings/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when not authenticated", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(null);
		const request = makePutRequest("/api/user-settings", {
			advancedMode: true,
		});

		const response = await PUT({ request } as never);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Unauthorized" });
	});

	it("updates advancedMode", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeUserSettings({ advancedMode: true });
		mockReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/user-settings", {
			advancedMode: true,
		});

		const response = await PUT({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.advancedMode).toBe(true);
	});

	it("updates apiEnabled and webhooksEnabled", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeUserSettings({
			apiEnabled: true,
			webhooksEnabled: true,
		});
		mockReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/user-settings", {
			apiEnabled: true,
			webhooksEnabled: true,
		});

		const response = await PUT({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.apiEnabled).toBe(true);
		expect(data.webhooksEnabled).toBe(true);
	});

	it("updates nutritionEnabled", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeUserSettings({ nutritionEnabled: true });
		mockReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/user-settings", {
			nutritionEnabled: true,
		});

		const response = await PUT({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.nutritionEnabled).toBe(true);
	});

	it("updates weekStartDay", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeUserSettings({ weekStartDay: 0 });
		mockReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/user-settings", {
			weekStartDay: 0,
		});

		const response = await PUT({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.weekStartDay).toBe(0);
	});

	it("performs partial update without affecting other fields", async () => {
		vi.mocked(getAuthSession).mockResolvedValue(makeSession() as never);
		const updated = makeUserSettings({
			advancedMode: true,
			apiEnabled: false,
		});
		mockReturning.mockResolvedValue([updated]);
		const request = makePutRequest("/api/user-settings", {
			advancedMode: true,
		});

		const response = await PUT({ request } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.advancedMode).toBe(true);
		expect(data.apiEnabled).toBe(false);
	});
});
