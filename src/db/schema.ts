import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

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

export const product = pgTable(
	"product",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		category: text("category"),
		description: text("description"),
		image: text("image"),
		expirationDate: timestamp("expiration_date"),
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
}));
