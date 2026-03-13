import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "#src/tests/helpers/factories";

const mockGetSession = vi.fn();

vi.mock("#src/lib/auth", () => ({
	auth: {
		api: {
			getSession: (...args: unknown[]) => mockGetSession(...args),
		},
	},
}));

vi.mock("#src/db/auth-schema", () => ({
	user: {},
}));

vi.mock("#src/db/schema", () => ({
	apiKey: {},
}));

const mockSelectLimit = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock("#src/db", () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: mockSelectLimit,
				})),
			})),
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: mockUpdateWhere,
			})),
		})),
	},
}));

const { getAuthSession } = await import("#src/lib/auth-session");

describe("getAuthSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns session from cookies when available", async () => {
		const sessionData = { user: makeUser(), session: { id: "s-1" } };
		mockGetSession.mockResolvedValue(sessionData);

		const request = new Request("http://localhost:3000/api/test");
		const result = await getAuthSession(request);

		expect(result).toBe(sessionData);
	});

	it("returns null when no session and no Authorization header", async () => {
		mockGetSession.mockResolvedValue(null);

		const request = new Request("http://localhost:3000/api/test");
		const result = await getAuthSession(request);

		expect(result).toBeNull();
	});

	it("returns null for non-Bearer Authorization header", async () => {
		mockGetSession.mockResolvedValue(null);

		const request = new Request("http://localhost:3000/api/test", {
			headers: { Authorization: "Basic abc123" },
		});
		const result = await getAuthSession(request);

		expect(result).toBeNull();
	});

	it("returns null when Bearer token is empty", async () => {
		mockGetSession.mockResolvedValue(null);

		const request = new Request("http://localhost:3000/api/test", {
			headers: { Authorization: "Bearer " },
		});
		const result = await getAuthSession(request);

		expect(result).toBeNull();
	});

	it("returns null when API key hash not found in database", async () => {
		mockGetSession.mockResolvedValue(null);
		mockSelectLimit.mockResolvedValue([]);

		const request = new Request("http://localhost:3000/api/test", {
			headers: { Authorization: "Bearer km_invalidkey123" },
		});
		const result = await getAuthSession(request);

		expect(result).toBeNull();
	});

	it("returns user session when valid API key is provided", async () => {
		mockGetSession.mockResolvedValue(null);
		const foundUser = makeUser();

		// First select: find API key by hash
		mockSelectLimit.mockResolvedValueOnce([
			{ id: "api-key-1", userId: "user-1" },
		]);
		// Second select: find user by id
		mockSelectLimit.mockResolvedValueOnce([foundUser]);
		mockUpdateWhere.mockResolvedValue(undefined);

		const request = new Request("http://localhost:3000/api/test", {
			headers: { Authorization: "Bearer km_somevalidkey" },
		});
		const result = await getAuthSession(request);

		expect(result).toEqual({ user: foundUser, session: null });
	});

	it("updates lastUsedAt when API key is used", async () => {
		mockGetSession.mockResolvedValue(null);
		const foundUser = makeUser();

		mockSelectLimit.mockResolvedValueOnce([
			{ id: "api-key-1", userId: "user-1" },
		]);
		mockSelectLimit.mockResolvedValueOnce([foundUser]);
		mockUpdateWhere.mockResolvedValue(undefined);

		const request = new Request("http://localhost:3000/api/test", {
			headers: { Authorization: "Bearer km_somevalidkey" },
		});
		await getAuthSession(request);

		expect(mockUpdateWhere).toHaveBeenCalled();
	});

	it("returns null when API key exists but user not found", async () => {
		mockGetSession.mockResolvedValue(null);

		mockSelectLimit.mockResolvedValueOnce([
			{ id: "api-key-1", userId: "user-1" },
		]);
		mockSelectLimit.mockResolvedValueOnce([]);
		mockUpdateWhere.mockResolvedValue(undefined);

		const request = new Request("http://localhost:3000/api/test", {
			headers: { Authorization: "Bearer km_somevalidkey" },
		});
		const result = await getAuthSession(request);

		expect(result).toBeNull();
	});
});
