ALTER TABLE "product" ADD COLUMN "calories" numeric;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "protein" numeric;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "fat" numeric;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "carbs" numeric;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "nutrition_enabled" boolean DEFAULT false NOT NULL;