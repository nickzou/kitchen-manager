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
		description: "Whole milk",
		image: null,
		categoryId: null,
		quantityUnitId: null,
		minStockAmount: "0",
		defaultExpirationDays: null,
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeQuantityUnit(overrides?: Record<string, unknown>) {
	return {
		id: "unit-1",
		name: "Pieces",
		abbreviation: "pcs",
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeStockEntry(overrides?: Record<string, unknown>) {
	return {
		id: "stock-entry-1",
		productId: "product-1",
		quantity: "10",
		expirationDate: null,
		purchaseDate: null,
		price: null,
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeStockLog(overrides?: Record<string, unknown>) {
	return {
		id: "stock-log-1",
		stockEntryId: "stock-entry-1",
		productId: "product-1",
		transactionType: "add",
		quantity: "10",
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}
