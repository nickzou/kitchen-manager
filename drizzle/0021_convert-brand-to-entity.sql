CREATE TABLE "brand" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_entry" ADD COLUMN "brand_id" text;--> statement-breakpoint
ALTER TABLE "brand" ADD CONSTRAINT "brand_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_userId_idx" ON "brand" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "stock_entry" ADD CONSTRAINT "stock_entry_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stockEntry_brandId_idx" ON "stock_entry" USING btree ("brand_id");--> statement-breakpoint
ALTER TABLE "stock_entry" DROP COLUMN "brand";