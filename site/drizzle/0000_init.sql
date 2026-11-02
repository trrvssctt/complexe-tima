CREATE TYPE "public"."fulfillment_mode" AS ENUM('livraison', 'retrait');--> statement-breakpoint
CREATE TYPE "public"."order_origin" AS ENUM('site', 'whatsapp', 'liste_fournitures', 'boutique');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('nouvelle', 'en_preparation', 'prete', 'livree', 'annulee');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('wave', 'orange_money', 'a_la_livraison');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('a_confirmer', 'paye', 'rembourse');--> statement-breakpoint
CREATE TYPE "public"."school_level" AS ENUM('cp_ce2', 'cm1_cm2', 'college', 'lycee');--> statement-breakpoint
CREATE TYPE "public"."supply_list_status" AS ENUM('nouvelle', 'pack_pret', 'rappele', 'convertie', 'abandonnee');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('en_cours', 'succes', 'echec');--> statement-breakpoint
CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"universe_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "delivery_zones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"fee" integer,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"type" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"author" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"variant_id" integer,
	"sku" text NOT NULL,
	"label" text NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"number" text DEFAULT 'TIMA-' || lpad(nextval('order_number_seq')::text, 4, '0') NOT NULL,
	"customer_id" integer,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"status" "order_status" DEFAULT 'nouvelle' NOT NULL,
	"origin" "order_origin" DEFAULT 'site' NOT NULL,
	"fulfillment" "fulfillment_mode" NOT NULL,
	"delivery_zone_id" integer,
	"address" text,
	"subtotal" integer NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'a_confirmer' NOT NULL,
	"paid_at" timestamp with time zone,
	"internal_note" text,
	"gestockpro_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "pack_items" (
	"pack_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "pack_items_pack_id_variant_id_pk" PRIMARY KEY("pack_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "packs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "packs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"level" "school_level" NOT NULL,
	"description" text,
	"image_url" text,
	"visible" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_images_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"url" text NOT NULL,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"sku" text NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price" integer,
	"purchase_price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 3 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"gestockpro_ref" text,
	"stock_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_gestockproRef_unique" UNIQUE("gestockpro_ref")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sku" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"brand" text,
	"universe_id" integer NOT NULL,
	"category_id" integer,
	"option_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"internal_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "related_products" (
	"product_id" integer NOT NULL,
	"related_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "related_products_product_id_related_id_pk" PRIMARY KEY("product_id","related_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_alerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_alerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"variant_id" integer NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "supply_list_lines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "supply_list_lines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"supply_list_id" integer NOT NULL,
	"label" text NOT NULL,
	"variant_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_lists" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "supply_lists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customer_id" integer,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"level" "school_level" NOT NULL,
	"raw_text" text,
	"file_url" text,
	"fulfillment" "fulfillment_mode" NOT NULL,
	"status" "supply_list_status" DEFAULT 'nouvelle' NOT NULL,
	"order_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sync_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" "sync_status" DEFAULT 'en_cours' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"updated_variants" integer DEFAULT 0 NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "universes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "universes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"tagline" text,
	"color" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "universes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_delivery_zones_id_fk" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_products" ADD CONSTRAINT "related_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_products" ADD CONSTRAINT "related_products_related_id_products_id_fk" FOREIGN KEY ("related_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_list_lines" ADD CONSTRAINT "supply_list_lines_supply_list_id_supply_lists_id_fk" FOREIGN KEY ("supply_list_id") REFERENCES "public"."supply_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_list_lines" ADD CONSTRAINT "supply_list_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_lists" ADD CONSTRAINT "supply_lists_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_lists" ADD CONSTRAINT "supply_lists_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_universe_id_slug_index" ON "categories" USING btree ("universe_id","slug");--> statement-breakpoint
CREATE INDEX "order_events_order_id_index" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_index" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_index" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_at_index" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_phone_index" ON "orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "product_images_product_id_index" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_index" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_universe_id_index" ON "products" USING btree ("universe_id");--> statement-breakpoint
CREATE INDEX "products_category_id_index" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_alerts_variant_id_phone_index" ON "stock_alerts" USING btree ("variant_id","phone");--> statement-breakpoint
CREATE INDEX "supply_list_lines_supply_list_id_index" ON "supply_list_lines" USING btree ("supply_list_id");--> statement-breakpoint
CREATE INDEX "supply_lists_status_index" ON "supply_lists" USING btree ("status");