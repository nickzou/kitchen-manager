ALTER TABLE "product" ADD COLUMN "default_tare_weight" numeric;--> statement-breakpoint
ALTER TABLE "stock_entry" ADD COLUMN "tare_weight" numeric;