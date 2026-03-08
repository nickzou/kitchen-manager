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

export const quantityUnitRelations = relations(quantityUnit, ({ one }) => ({
	user: one(user, {
		fields: [quantityUnit.userId],
		references: [user.id],
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
