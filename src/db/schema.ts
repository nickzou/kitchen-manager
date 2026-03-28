import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const transactionTypeEnum = pgEnum("transaction_type", [
	"add",
	"consume",
	"remove",
]);

export const webhookStatusEnum = pgEnum("webhook_status", [
	"active",
	"suspended",
]);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
	"pending",
	"success",
	"failed",
]);

export const productCategoryType = pgTable(
	"product_category_type",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		description: text("description"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("productCategoryType_userId_idx").on(table.userId)],
);

export const productCategoryTypeRelations = relations(
	productCategoryType,
	({ one, many }) => ({
		user: one(user, {
			fields: [productCategoryType.userId],
			references: [user.id],
		}),
		products: many(productCategory),
	}),
);

export const recipeCategoryType = pgTable(
	"recipe_category_type",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		description: text("description"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("recipeCategoryType_userId_idx").on(table.userId)],
);

export const recipeCategoryTypeRelations = relations(
	recipeCategoryType,
	({ one, many }) => ({
		user: one(user, {
			fields: [recipeCategoryType.userId],
			references: [user.id],
		}),
		recipes: many(recipeCategory),
	}),
);

export const quantityUnit = pgTable(
	"quantity_unit",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		abbreviation: text("abbreviation"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("quantityUnit_userId_idx").on(table.userId)],
);

export const quantityUnitRelations = relations(
	quantityUnit,
	({ one, many }) => ({
		user: one(user, {
			fields: [quantityUnit.userId],
			references: [user.id],
		}),
		conversionsFrom: many(unitConversion, { relationName: "fromUnit" }),
		conversionsTo: many(unitConversion, { relationName: "toUnit" }),
	}),
);

export const unitConversion = pgTable(
	"unit_conversion",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		fromUnitId: text("from_unit_id")
			.notNull()
			.references(() => quantityUnit.id, { onDelete: "cascade" }),
		toUnitId: text("to_unit_id")
			.notNull()
			.references(() => quantityUnit.id, { onDelete: "cascade" }),
		factor: numeric("factor").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("unitConversion_userId_idx").on(table.userId)],
);

export const unitConversionRelations = relations(unitConversion, ({ one }) => ({
	user: one(user, {
		fields: [unitConversion.userId],
		references: [user.id],
	}),
	fromUnit: one(quantityUnit, {
		fields: [unitConversion.fromUnitId],
		references: [quantityUnit.id],
		relationName: "fromUnit",
	}),
	toUnit: one(quantityUnit, {
		fields: [unitConversion.toUnitId],
		references: [quantityUnit.id],
		relationName: "toUnit",
	}),
}));

export const productCategory = pgTable(
	"product_category",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		categoryId: text("category_id")
			.notNull()
			.references(() => productCategoryType.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("productCategory_productId_idx").on(table.productId),
		index("productCategory_categoryId_idx").on(table.categoryId),
	],
);

export const productCategoryRelations = relations(
	productCategory,
	({ one }) => ({
		product: one(product, {
			fields: [productCategory.productId],
			references: [product.id],
		}),
		category: one(productCategoryType, {
			fields: [productCategory.categoryId],
			references: [productCategoryType.id],
		}),
	}),
);

export const recipeCategory = pgTable(
	"recipe_category",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		recipeId: text("recipe_id")
			.notNull()
			.references(() => recipe.id, { onDelete: "cascade" }),
		categoryId: text("category_id")
			.notNull()
			.references(() => recipeCategoryType.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("recipeCategory_recipeId_idx").on(table.recipeId),
		index("recipeCategory_categoryId_idx").on(table.categoryId),
	],
);

export const recipeCategoryRelations = relations(recipeCategory, ({ one }) => ({
	recipe: one(recipe, {
		fields: [recipeCategory.recipeId],
		references: [recipe.id],
	}),
	category: one(recipeCategoryType, {
		fields: [recipeCategory.categoryId],
		references: [recipeCategoryType.id],
	}),
}));

export const product = pgTable(
	"product",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		description: text("description"),
		image: text("image"),
		defaultQuantityUnitId: text("default_quantity_unit_id").references(
			() => quantityUnit.id,
			{
				onDelete: "set null",
			},
		),
		minStockAmount: numeric("min_stock_amount").default("0").notNull(),
		defaultExpirationDays: integer("default_expiration_days"),
		defaultConsumeAmount: numeric("default_consume_amount"),
		calories: numeric("calories"),
		protein: numeric("protein"),
		fat: numeric("fat"),
		carbs: numeric("carbs"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("product_userId_idx").on(table.userId),
		unique("product_userId_name_unique").on(table.userId, table.name),
	],
);

export const productRelations = relations(product, ({ one, many }) => ({
	user: one(user, {
		fields: [product.userId],
		references: [user.id],
	}),
	categories: many(productCategory),
	defaultQuantityUnit: one(quantityUnit, {
		fields: [product.defaultQuantityUnitId],
		references: [quantityUnit.id],
	}),
	unitConversions: many(productUnitConversion),
}));

export const productUnitConversion = pgTable(
	"product_unit_conversion",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		fromUnitId: text("from_unit_id")
			.notNull()
			.references(() => quantityUnit.id, { onDelete: "cascade" }),
		toUnitId: text("to_unit_id")
			.notNull()
			.references(() => quantityUnit.id, { onDelete: "cascade" }),
		factor: numeric("factor").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("productUnitConversion_productId_idx").on(table.productId),
		index("productUnitConversion_userId_idx").on(table.userId),
	],
);

export const productUnitConversionRelations = relations(
	productUnitConversion,
	({ one }) => ({
		product: one(product, {
			fields: [productUnitConversion.productId],
			references: [product.id],
		}),
		user: one(user, {
			fields: [productUnitConversion.userId],
			references: [user.id],
		}),
		fromUnit: one(quantityUnit, {
			fields: [productUnitConversion.fromUnitId],
			references: [quantityUnit.id],
			relationName: "productFromUnit",
		}),
		toUnit: one(quantityUnit, {
			fields: [productUnitConversion.toUnitId],
			references: [quantityUnit.id],
			relationName: "productToUnit",
		}),
	}),
);

export const brand = pgTable(
	"brand",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("brand_userId_idx").on(table.userId)],
);

export const brandRelations = relations(brand, ({ one }) => ({
	user: one(user, {
		fields: [brand.userId],
		references: [user.id],
	}),
}));

export const store = pgTable(
	"store",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("store_userId_idx").on(table.userId)],
);

export const storeRelations = relations(store, ({ one }) => ({
	user: one(user, {
		fields: [store.userId],
		references: [user.id],
	}),
}));

export const stockEntry = pgTable(
	"stock_entry",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		quantity: numeric("quantity").notNull(),
		expirationDate: timestamp("expiration_date"),
		purchaseDate: timestamp("purchase_date"),
		price: numeric("price"),
		storeId: text("store_id").references(() => store.id, {
			onDelete: "set null",
		}),
		brandId: text("brand_id").references(() => brand.id, {
			onDelete: "set null",
		}),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("stockEntry_userId_idx").on(table.userId),
		index("stockEntry_productId_idx").on(table.productId),
		index("stockEntry_storeId_idx").on(table.storeId),
		index("stockEntry_brandId_idx").on(table.brandId),
	],
);

export const stockEntryRelations = relations(stockEntry, ({ one }) => ({
	user: one(user, {
		fields: [stockEntry.userId],
		references: [user.id],
	}),
	product: one(product, {
		fields: [stockEntry.productId],
		references: [product.id],
	}),
	store: one(store, {
		fields: [stockEntry.storeId],
		references: [store.id],
	}),
	brand: one(brand, {
		fields: [stockEntry.brandId],
		references: [brand.id],
	}),
}));

export const stockLog = pgTable(
	"stock_log",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		stockEntryId: text("stock_entry_id").references(() => stockEntry.id, {
			onDelete: "set null",
		}),
		productId: text("product_id")
			.notNull()
			.references(() => product.id, { onDelete: "cascade" }),
		transactionType: transactionTypeEnum("transaction_type").notNull(),
		quantity: numeric("quantity").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("stockLog_userId_idx").on(table.userId),
		index("stockLog_productId_idx").on(table.productId),
		index("stockLog_stockEntryId_idx").on(table.stockEntryId),
	],
);

export const stockLogRelations = relations(stockLog, ({ one }) => ({
	user: one(user, {
		fields: [stockLog.userId],
		references: [user.id],
	}),
	product: one(product, {
		fields: [stockLog.productId],
		references: [product.id],
	}),
	stockEntry: one(stockEntry, {
		fields: [stockLog.stockEntryId],
		references: [stockEntry.id],
	}),
}));

export const recipe = pgTable(
	"recipe",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		description: text("description"),
		image: text("image"),
		servings: integer("servings"),
		prepTime: integer("prep_time"),
		cookTime: integer("cook_time"),
		instructions: text("instructions"),
		producedProductId: text("produced_product_id").references(
			() => product.id,
			{ onDelete: "set null" },
		),
		producedQuantity: numeric("produced_quantity"),
		producedQuantityUnitId: text("produced_quantity_unit_id").references(
			() => quantityUnit.id,
			{ onDelete: "set null" },
		),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("recipe_userId_idx").on(table.userId)],
);

export const recipeRelations = relations(recipe, ({ one, many }) => ({
	user: one(user, {
		fields: [recipe.userId],
		references: [user.id],
	}),
	categories: many(recipeCategory),
	ingredients: many(recipeIngredient),
	prepSteps: many(recipePrepStep),
	producedProduct: one(product, {
		fields: [recipe.producedProductId],
		references: [product.id],
	}),
	producedQuantityUnit: one(quantityUnit, {
		fields: [recipe.producedQuantityUnitId],
		references: [quantityUnit.id],
	}),
}));

export const recipeIngredient = pgTable(
	"recipe_ingredient",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		recipeId: text("recipe_id")
			.notNull()
			.references(() => recipe.id, { onDelete: "cascade" }),
		productId: text("product_id").references(() => product.id, {
			onDelete: "set null",
		}),
		quantity: numeric("quantity").notNull(),
		quantityUnitId: text("quantity_unit_id").references(() => quantityUnit.id, {
			onDelete: "set null",
		}),
		notes: text("notes"),
		groupName: text("group_name"),
		sortOrder: integer("sort_order").default(0).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("recipeIngredient_userId_idx").on(table.userId),
		index("recipeIngredient_recipeId_idx").on(table.recipeId),
	],
);

export const recipeIngredientRelations = relations(
	recipeIngredient,
	({ one }) => ({
		user: one(user, {
			fields: [recipeIngredient.userId],
			references: [user.id],
		}),
		recipe: one(recipe, {
			fields: [recipeIngredient.recipeId],
			references: [recipe.id],
		}),
		product: one(product, {
			fields: [recipeIngredient.productId],
			references: [product.id],
		}),
		quantityUnit: one(quantityUnit, {
			fields: [recipeIngredient.quantityUnitId],
			references: [quantityUnit.id],
		}),
	}),
);

export const recipePrepStep = pgTable(
	"recipe_prep_step",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		recipeId: text("recipe_id")
			.notNull()
			.references(() => recipe.id, { onDelete: "cascade" }),
		description: text("description").notNull(),
		leadTimeMinutes: integer("lead_time_minutes").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("recipePrepStep_userId_idx").on(table.userId),
		index("recipePrepStep_recipeId_idx").on(table.recipeId),
	],
);

export const recipePrepStepRelations = relations(recipePrepStep, ({ one }) => ({
	user: one(user, {
		fields: [recipePrepStep.userId],
		references: [user.id],
	}),
	recipe: one(recipe, {
		fields: [recipePrepStep.recipeId],
		references: [recipe.id],
	}),
}));

export const mealSlot = pgTable(
	"meal_slot",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("mealSlot_userId_idx").on(table.userId)],
);

export const mealSlotRelations = relations(mealSlot, ({ one, many }) => ({
	user: one(user, {
		fields: [mealSlot.userId],
		references: [user.id],
	}),
	entries: many(mealPlanEntry),
}));

export const mealPlanEntry = pgTable(
	"meal_plan_entry",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		date: date("date").notNull(),
		mealSlotId: text("meal_slot_id")
			.notNull()
			.references(() => mealSlot.id, { onDelete: "cascade" }),
		recipeId: text("recipe_id")
			.notNull()
			.references(() => recipe.id, { onDelete: "cascade" }),
		servings: integer("servings"),
		sortOrder: integer("sort_order").default(0).notNull(),
		cookedAt: timestamp("cooked_at"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("mealPlanEntry_userId_idx").on(table.userId),
		index("mealPlanEntry_date_idx").on(table.date),
		index("mealPlanEntry_mealSlotId_idx").on(table.mealSlotId),
	],
);

export const mealPlanEntryRelations = relations(mealPlanEntry, ({ one }) => ({
	user: one(user, {
		fields: [mealPlanEntry.userId],
		references: [user.id],
	}),
	mealSlot: one(mealSlot, {
		fields: [mealPlanEntry.mealSlotId],
		references: [mealSlot.id],
	}),
	recipe: one(recipe, {
		fields: [mealPlanEntry.recipeId],
		references: [recipe.id],
	}),
}));

export const apiKey = pgTable(
	"api_key",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		keyHash: text("key_hash").notNull(),
		keyPrefix: text("key_prefix").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		lastUsedAt: timestamp("last_used_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("apiKey_keyHash_idx").on(table.keyHash),
		index("apiKey_userId_idx").on(table.userId),
	],
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
	user: one(user, {
		fields: [apiKey.userId],
		references: [user.id],
	}),
}));

export const webhookEndpoint = pgTable(
	"webhook_endpoint",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		url: text("url").notNull(),
		secret: text("secret").notNull(),
		events: text("events").array().notNull(),
		status: webhookStatusEnum("status").default("active").notNull(),
		failCount: integer("fail_count").default(0).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("webhookEndpoint_userId_idx").on(table.userId)],
);

export const webhookEndpointRelations = relations(
	webhookEndpoint,
	({ one, many }) => ({
		user: one(user, {
			fields: [webhookEndpoint.userId],
			references: [user.id],
		}),
		deliveries: many(webhookDelivery),
	}),
);

export const webhookDelivery = pgTable(
	"webhook_delivery",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		webhookEndpointId: text("webhook_endpoint_id")
			.notNull()
			.references(() => webhookEndpoint.id, { onDelete: "cascade" }),
		event: text("event").notNull(),
		payload: text("payload").notNull(),
		status: webhookDeliveryStatusEnum("status").default("pending").notNull(),
		statusCode: integer("status_code"),
		attempt: integer("attempt").default(0).notNull(),
		nextRetryAt: timestamp("next_retry_at"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("webhookDelivery_endpointId_idx").on(table.webhookEndpointId),
		index("webhookDelivery_userId_idx").on(table.userId),
		index("webhookDelivery_status_retry_idx").on(
			table.status,
			table.nextRetryAt,
		),
	],
);

export const webhookDeliveryRelations = relations(
	webhookDelivery,
	({ one }) => ({
		webhookEndpoint: one(webhookEndpoint, {
			fields: [webhookDelivery.webhookEndpointId],
			references: [webhookEndpoint.id],
		}),
		user: one(user, {
			fields: [webhookDelivery.userId],
			references: [user.id],
		}),
	}),
);

export const userSettings = pgTable("user_settings", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	advancedMode: boolean("advanced_mode").default(false).notNull(),
	apiEnabled: boolean("api_enabled").default(false).notNull(),
	webhooksEnabled: boolean("webhooks_enabled").default(false).notNull(),
	nutritionEnabled: boolean("nutrition_enabled").default(false).notNull(),
	weekStartDay: integer("week_start_day").default(1).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
	user: one(user, {
		fields: [userSettings.userId],
		references: [user.id],
	}),
}));
