CREATE TABLE "meal_plan_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"meal_slot_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"servings" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_slot" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_plan_entry" ADD CONSTRAINT "meal_plan_entry_meal_slot_id_meal_slot_id_fk" FOREIGN KEY ("meal_slot_id") REFERENCES "public"."meal_slot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_entry" ADD CONSTRAINT "meal_plan_entry_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_entry" ADD CONSTRAINT "meal_plan_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_slot" ADD CONSTRAINT "meal_slot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mealPlanEntry_userId_idx" ON "meal_plan_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mealPlanEntry_date_idx" ON "meal_plan_entry" USING btree ("date");--> statement-breakpoint
CREATE INDEX "mealPlanEntry_mealSlotId_idx" ON "meal_plan_entry" USING btree ("meal_slot_id");--> statement-breakpoint
CREATE INDEX "mealSlot_userId_idx" ON "meal_slot" USING btree ("user_id");