CREATE TABLE "recipe" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"servings" integer,
	"prep_time" integer,
	"cook_time" integer,
	"instructions" text,
	"category_id" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredient" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"product_id" text,
	"quantity" numeric NOT NULL,
	"quantity_unit_id" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_quantity_unit_id_quantity_unit_id_fk" FOREIGN KEY ("quantity_unit_id") REFERENCES "public"."quantity_unit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_userId_idx" ON "recipe" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipeIngredient_userId_idx" ON "recipe_ingredient" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipeIngredient_recipeId_idx" ON "recipe_ingredient" USING btree ("recipe_id");