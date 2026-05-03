ALTER TABLE "product" ADD COLUMN "nutrition_base_amount" numeric DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "nutrition_base_unit_id" text;--> statement-breakpoint
UPDATE "product" SET "nutrition_base_unit_id" = "default_quantity_unit_id" WHERE "nutrition_base_unit_id" IS NULL;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_nutrition_base_unit_id_quantity_unit_id_fk" FOREIGN KEY ("nutrition_base_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE set null ON UPDATE no action;