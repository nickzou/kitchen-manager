CREATE TABLE "product_unit_conversion" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"from_unit_id" text NOT NULL,
	"to_unit_id" text NOT NULL,
	"factor" numeric NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_unit_conversion" ADD CONSTRAINT "product_unit_conversion_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_unit_conversion" ADD CONSTRAINT "product_unit_conversion_from_unit_id_quantity_unit_id_fk" FOREIGN KEY ("from_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_unit_conversion" ADD CONSTRAINT "product_unit_conversion_to_unit_id_quantity_unit_id_fk" FOREIGN KEY ("to_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_unit_conversion" ADD CONSTRAINT "product_unit_conversion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "productUnitConversion_productId_idx" ON "product_unit_conversion" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX "productUnitConversion_userId_idx" ON "product_unit_conversion" USING btree ("user_id");
