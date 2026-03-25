ALTER TABLE "user_settings" ADD COLUMN "api_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "webhooks_enabled" boolean DEFAULT false NOT NULL;