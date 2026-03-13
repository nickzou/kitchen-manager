CREATE TABLE "store" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_entry" ADD COLUMN "store_id" text;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "store_userId_idx" ON "store" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "stock_entry" ADD CONSTRAINT "stock_entry_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stockEntry_storeId_idx" ON "stock_entry" USING btree ("store_id");