ALTER TABLE "recipe" ADD COLUMN "produced_product_id" text;
--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "produced_quantity" numeric;
--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "produced_quantity_unit_id" text;
--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_produced_product_id_product_id_fk" FOREIGN KEY ("produced_product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_produced_quantity_unit_id_quantity_unit_id_fk" FOREIGN KEY ("produced_quantity_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE set null ON UPDATE no action;
