ALTER TABLE "product" DROP CONSTRAINT "product_userId_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "brand_userId_name_unique" ON "brand" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "product_userId_name_unique" ON "product" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "productCategoryType_userId_name_unique" ON "product_category_type" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "quantityUnit_userId_name_unique" ON "quantity_unit" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_userId_name_unique" ON "recipe" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "recipeCategoryType_userId_name_unique" ON "recipe_category_type" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "store_userId_name_unique" ON "store" USING btree ("user_id",lower("name"));