CREATE TYPE "public"."order_lifecycle" AS ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cod', 'bkash', 'nagad', 'fake', 'sslcommerz');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'awaiting_verification', 'paid', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."size" AS ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"cart_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_cart_variant_unique" UNIQUE("cart_id","variant_id"),
	CONSTRAINT "quantity_positive" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"size" "size" NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tran_id" text NOT NULL,
	"access_token" text NOT NULL,
	"user_id" text,
	"cart_id" integer,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"order_status" "order_lifecycle" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cod' NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"shipping_minor" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"area" text NOT NULL,
	"city" text NOT NULL,
	"postcode" text,
	"customer_email" text,
	"payment_ref" text,
	"trx_id" text,
	"screenshot_key" text,
	"stock_decremented" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "orders_tran_id_unique" UNIQUE("tran_id"),
	CONSTRAINT "orders_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"placeholder_key" text NOT NULL,
	"storage_key" text,
	"alt" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"size" "size" NOT NULL,
	"sku" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "stock_non_negative" CHECK ("product_variants"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price_minor" integer NOT NULL,
	"category_id" integer NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;