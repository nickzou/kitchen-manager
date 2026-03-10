CREATE TABLE "unit_conversion" (
	"id" text PRIMARY KEY NOT NULL,
	"from_unit_id" text NOT NULL,
	"to_unit_id" text NOT NULL,
	"factor" numeric NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unit_conversion" ADD CONSTRAINT "unit_conversion_from_unit_id_quantity_unit_id_fk" FOREIGN KEY ("from_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_conversion" ADD CONSTRAINT "unit_conversion_to_unit_id_quantity_unit_id_fk" FOREIGN KEY ("to_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_conversion" ADD CONSTRAINT "unit_conversion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unitConversion_userId_idx" ON "unit_conversion" USING btree ("user_id");