ALTER TABLE "order_items" ALTER COLUMN "unit_price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "line_total" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "subtotal" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "visible" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "swatch" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gift_idea" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "options_note" text;--> statement-breakpoint
ALTER TABLE "universes" ADD COLUMN "description" text;