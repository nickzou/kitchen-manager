ALTER TABLE "product" RENAME COLUMN "quantity_unit_id" TO "default_quantity_unit_id";--> statement-breakpoint
ALTER TABLE "product" DROP CONSTRAINT "product_quantity_unit_id_quantity_unit_id_fk";
--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_default_quantity_unit_id_quantity_unit_id_fk" FOREIGN KEY ("default_quantity_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE set null ON UPDATE no action;