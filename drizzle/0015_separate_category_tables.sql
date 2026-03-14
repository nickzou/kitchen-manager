-- Create product_category_type table
CREATE TABLE IF NOT EXISTS "product_category_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "productCategoryType_userId_idx" ON "product_category_type" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "product_category_type" ADD CONSTRAINT "product_category_type_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create recipe_category_type table
CREATE TABLE IF NOT EXISTS "recipe_category_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipeCategoryType_userId_idx" ON "recipe_category_type" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "recipe_category_type" ADD CONSTRAINT "recipe_category_type_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Copy ALL existing categories into product_category_type (they were created via Inventory)
INSERT INTO "product_category_type" ("id", "name", "description", "user_id", "created_at", "updated_at")
SELECT "id", "name", "description", "user_id", "created_at", "updated_at"
FROM "category";
--> statement-breakpoint

-- Copy categories that are linked to recipes into recipe_category_type
INSERT INTO "recipe_category_type" ("id", "name", "description", "user_id", "created_at", "updated_at")
SELECT DISTINCT c."id", c."name", c."description", c."user_id", c."created_at", c."updated_at"
FROM "category" c
INNER JOIN "recipe_category" rc ON rc."category_id" = c."id";
--> statement-breakpoint

-- Drop old FK constraints on join tables
ALTER TABLE "product_category" DROP CONSTRAINT IF EXISTS "product_category_category_id_category_id_fk";
--> statement-breakpoint
ALTER TABLE "recipe_category" DROP CONSTRAINT IF EXISTS "recipe_category_category_id_category_id_fk";
--> statement-breakpoint

-- Add new FK constraints pointing to new tables
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_category_id_product_category_type_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category_type"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipe_category" ADD CONSTRAINT "recipe_category_category_id_recipe_category_type_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."recipe_category_type"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Drop old category table
DROP TABLE IF EXISTS "category";
