CREATE TYPE "public"."transaction_type" AS ENUM('add', 'consume', 'remove');--> statement-breakpoint
CREATE TABLE "quantity_unit" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"quantity" numeric NOT NULL,
	"expiration_date" timestamp,
	"purchase_date" timestamp,
	"price" numeric,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_log" (
	"id" text PRIMARY KEY NOT NULL,
	"stock_entry_id" text,
	"product_id" text NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"quantity" numeric NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "quantity_unit_id" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "min_stock_amount" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "default_expiration_days" integer;--> statement-breakpoint
ALTER TABLE "quantity_unit" ADD CONSTRAINT "quantity_unit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_entry" ADD CONSTRAINT "stock_entry_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_entry" ADD CONSTRAINT "stock_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_log" ADD CONSTRAINT "stock_log_stock_entry_id_stock_entry_id_fk" FOREIGN KEY ("stock_entry_id") REFERENCES "public"."stock_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_log" ADD CONSTRAINT "stock_log_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_log" ADD CONSTRAINT "stock_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quantityUnit_userId_idx" ON "quantity_unit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stockEntry_userId_idx" ON "stock_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stockEntry_productId_idx" ON "stock_entry" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stockLog_userId_idx" ON "stock_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stockLog_productId_idx" ON "stock_log" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stockLog_stockEntryId_idx" ON "stock_log" USING btree ("stock_entry_id");--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_quantity_unit_id_quantity_unit_id_fk" FOREIGN KEY ("quantity_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "product" DROP COLUMN "expiration_date";