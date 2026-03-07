export function makeUser(overrides?: Record<string, unknown>) {
	return {
		id: "user-1",
		name: "Test User",
		email: "test@example.com",
		emailVerified: true,
		image: null,
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeSession(overrides?: Record<string, unknown>) {
	const user = makeUser(overrides?.user as Record<string, unknown>);
	return {
		user,
		session: {
			id: "session-1",
			token: "test-token",
			expiresAt: new Date("2099-01-01"),
			createdAt: new Date("2025-01-01"),
			updatedAt: new Date("2025-01-01"),
			ipAddress: null,
			userAgent: null,
			userId: user.id,
			...(overrides?.session as Record<string, unknown>),
		},
	};
}

export function makeCategory(overrides?: Record<string, unknown>) {
	return {
		id: "category-1",
		name: "Dairy",
		description: "Dairy products",
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeProduct(overrides?: Record<string, unknown>) {
	return {
		id: "product-1",
		name: "Milk",
		category: "Dairy",
		description: "Whole milk",
		image: null,
		expirationDate: new Date("2025-06-01"),
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}
