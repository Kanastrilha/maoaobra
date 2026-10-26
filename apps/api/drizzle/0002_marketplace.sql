CREATE TYPE "public"."order_status" AS ENUM('requested', 'accepted', 'declined', 'confirmed', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."period" AS ENUM('morning', 'afternoon', 'evening');--> statement-breakpoint
CREATE TYPE "public"."pro_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"mentions_contact" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"pro_id" text NOT NULL,
	"category_slug" text NOT NULL,
	"status" "order_status" DEFAULT 'requested' NOT NULL,
	"description" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"period" "period" NOT NULL,
	"address" text NOT NULL,
	"neighborhood" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pro_categories" (
	"user_id" text NOT NULL,
	"category_slug" text NOT NULL,
	CONSTRAINT "pro_categories_user_id_category_slug_pk" PRIMARY KEY("user_id","category_slug")
);
--> statement-breakpoint
CREATE TABLE "pro_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text NOT NULL,
	"cpf" text NOT NULL,
	"status" "pro_status" DEFAULT 'pending' NOT NULL,
	"service_radius_km" integer NOT NULL,
	"location" geometry(point) NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pro_profiles_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pro_id_users_id_fk" FOREIGN KEY ("pro_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_categories" ADD CONSTRAINT "pro_categories_user_id_pro_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pro_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_categories" ADD CONSTRAINT "pro_categories_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pro_profiles" ADD CONSTRAINT "pro_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_order_created_idx" ON "messages" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_pro_idx" ON "orders" USING btree ("pro_id");--> statement-breakpoint
CREATE INDEX "pro_profiles_location_idx" ON "pro_profiles" USING gist (("location"::geography));