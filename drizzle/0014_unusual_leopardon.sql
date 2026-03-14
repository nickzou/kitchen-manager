CREATE TABLE "product_category" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"category_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_category" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"category_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" DROP CONSTRAINT "product_category_id_category_id_fk";
--> statement-breakpoint
ALTER TABLE "recipe" DROP CONSTRAINT "recipe_category_id_category_id_fk";
--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_category" ADD CONSTRAINT "recipe_category_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_category" ADD CONSTRAINT "recipe_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "productCategory_productId_idx" ON "product_category" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "productCategory_categoryId_idx" ON "product_category" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "recipeCategory_recipeId_idx" ON "recipe_category" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipeCategory_categoryId_idx" ON "recipe_category" USING btree ("category_id");--> statement-breakpoint
INSERT INTO "product_category" ("id", "product_id", "category_id")
SELECT gen_random_uuid(), "id", "category_id" FROM "product" WHERE "category_id" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "recipe_category" ("id", "recipe_id", "category_id")
SELECT gen_random_uuid(), "id", "category_id" FROM "recipe" WHERE "category_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "product" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "recipe" DROP COLUMN "category_id";