import { relations } from "drizzle-orm";
import {
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const transactionTypeEnum = pgEnum("transaction_type", [
	"add",
	"consume",
	"remove",
]);

export const category = pgTable(
	"category",
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
	(table) => [index("category_userId_idx").on(table.userId)],
);

export const categoryRelations = relations(category, ({ one }) => ({
	user: one(user, {
		fields: [category.userId],
		references: [user.id],
	}),
}));

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

export const product = pgTable(
	"product",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		description: text("description"),
		image: text("image"),
		categoryId: text("category_id").references(() => category.id, {
			onDelete: "set null",
		}),
		quantityUnitId: text("quantity_unit_id").references(() => quantityUnit.id, {
			onDelete: "set null",
		}),
		minStockAmount: numeric("min_stock_amount").default("0").notNull(),
		defaultExpirationDays: integer("default_expiration_days"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("product_userId_idx").on(table.userId)],
);

export const productRelations = relations(product, ({ one }) => ({
	user: one(user, {
		fields: [product.userId],
		references: [user.id],
	}),
	category: one(category, {
		fields: [product.categoryId],
		references: [category.id],
	}),
	quantityUnit: one(quantityUnit, {
		fields: [product.quantityUnitId],
		references: [quantityUnit.id],
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
		categoryId: text("category_id").references(() => category.id, {
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
	(table) => [index("recipe_userId_idx").on(table.userId)],
);

export const recipeRelations = relations(recipe, ({ one, many }) => ({
	user: one(user, {
		fields: [recipe.userId],
		references: [user.id],
	}),
	category: one(category, {
		fields: [recipe.categoryId],
		references: [category.id],
	}),
	ingredients: many(recipeIngredient),
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
		date: timestamp("date").notNull(),
		mealSlotId: text("meal_slot_id")
			.notNull()
			.references(() => mealSlot.id, { onDelete: "cascade" }),
		recipeId: text("recipe_id")
			.notNull()
			.references(() => recipe.id, { onDelete: "cascade" }),
		servings: integer("servings"),
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
