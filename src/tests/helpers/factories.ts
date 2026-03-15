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

export function makeProductCategory(overrides?: Record<string, unknown>) {
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

export function makeRecipeCategory(overrides?: Record<string, unknown>) {
	return {
		id: "category-1",
		name: "Quick Meals",
		description: "Fast recipes",
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
		categoryIds: [],
		defaultQuantityUnitId: null,
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

export function makeUnitConversion(overrides?: Record<string, unknown>) {
	return {
		id: "conversion-1",
		fromUnitId: "unit-1",
		toUnitId: "unit-2",
		factor: "1000",
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeStore(overrides?: Record<string, unknown>) {
	return {
		id: "store-1",
		name: "Whole Foods",
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
		storeId: null,
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

export function makeRecipe(overrides?: Record<string, unknown>) {
	return {
		id: "recipe-1",
		name: "Pancakes",
		description: "Fluffy pancakes",
		image: null,
		servings: 4,
		prepTime: 10,
		cookTime: 15,
		instructions: "Mix and cook",
		categoryIds: [],
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeApiKey(overrides?: Record<string, unknown>) {
	return {
		id: "api-key-1",
		name: "My Script",
		keyPrefix: "km_a1b2c3d",
		keyHash: "abc123hash",
		userId: "user-1",
		lastUsedAt: null,
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeWebhookEndpoint(overrides?: Record<string, unknown>) {
	return {
		id: "webhook-endpoint-1",
		name: "My Webhook",
		url: "https://example.com/webhook",
		secret: "whsec_abc123",
		events: ["stock.entry.created"],
		status: "active",
		failCount: 0,
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeWebhookDelivery(overrides?: Record<string, unknown>) {
	return {
		id: "webhook-delivery-1",
		webhookEndpointId: "webhook-endpoint-1",
		event: "stock.entry.created",
		payload:
			'{"event":"stock.entry.created","data":{},"timestamp":"2025-01-01T00:00:00.000Z"}',
		status: "pending",
		statusCode: null,
		attempt: 1,
		nextRetryAt: null,
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeProductUnitConversion(overrides?: Record<string, unknown>) {
	return {
		id: "puc-1",
		productId: "product-1",
		fromUnitId: "unit-1",
		toUnitId: "unit-2",
		factor: "120",
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeRecipeIngredient(overrides?: Record<string, unknown>) {
	return {
		id: "recipe-ingredient-1",
		recipeId: "recipe-1",
		productId: "product-1",
		quantity: "2",
		quantityUnitId: null,
		notes: null,
		groupName: null,
		sortOrder: 0,
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}

export function makeRecipePrepStep(overrides?: Record<string, unknown>) {
	return {
		id: "prep-step-1",
		recipeId: "recipe-1",
		description: "Defrost chicken",
		leadTimeMinutes: 480,
		sortOrder: 0,
		userId: "user-1",
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	};
}
