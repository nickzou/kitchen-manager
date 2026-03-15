CREATE TABLE "recipe_prep_step" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"description" text NOT NULL,
	"lead_time_minutes" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_prep_step" ADD CONSTRAINT "recipe_prep_step_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_prep_step" ADD CONSTRAINT "recipe_prep_step_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipePrepStep_userId_idx" ON "recipe_prep_step" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipePrepStep_recipeId_idx" ON "recipe_prep_step" USING btree ("recipe_id");
