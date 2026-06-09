import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Unisex catalog. No gender anywhere.

export const sizeEnum = pgEnum("size", ["XS", "S", "M", "L", "XL", "XXL"]);

// Storefront visibility. Only `published` shows on the storefront; `archived`
// is hidden everywhere but kept for order-history FK integrity.
export const productStatusEnum = pgEnum("product_status", ["draft", "published", "archived"]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  // Integer minor units (poisha; 1/100 Taka). Never floats.
  priceMinor: integer("price_minor").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  featured: boolean("featured").notNull().default(false),
  status: productStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: sizeEnum("size").notNull(),
    sku: text("sku").notNull().unique(),
    stock: integer("stock").notNull().default(0),
  },
  (t) => [check("stock_non_negative", sql`${t.stock} >= 0`)],
);

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  // Deterministic placeholder key (Phase 2). When `storageKey` is set, an
  // uploaded image is served instead; otherwise the placeholder renders.
  placeholderKey: text("placeholder_key").notNull(),
  // Public storage key for an uploaded image (null = placeholder-only row).
  storageKey: text("storage_key"),
  alt: text("alt").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  // Reused as sortOrder for gallery ordering.
  position: integer("position").notNull().default(0),
});

// Relations — let a product load with category + variants + images in one query.
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  images: many(productImages),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// --- Cart (guest, server-authoritative, cookie-keyed; merge-ready) ---
// Phase 4 will merge a guest cart (resolved by the `aucto_cart` cookie →
// carts.sessionToken) into the signed-in user's cart (carts.userId) on login.
// userId is nullable so guest carts exist pre-auth and the merge is a no-schema
// change.
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("quantity_positive", sql`${t.quantity} > 0`),
    unique("cart_items_cart_variant_unique").on(t.cartId, t.variantId),
  ],
);

export const cartsRelations = relations(carts, ({ many }) => ({
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Size = (typeof sizeEnum.enumValues)[number];
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;

// --- Auth (Auth.js v5 + @auth/drizzle-adapter; credentials + JWT) ---
// Adapter table/column shapes follow the official Drizzle adapter schema.
// Extra columns: passwordHash (bcryptjs credentials) and role (future admin).
export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  passwordHash: text("password_hash"),
  // BD mobile number. Required at email/password registration; nullable because
  // Google sign-ups have no phone from the provider (they set it at checkout /
  // in account settings). Prefills the shipping phone for logged-in checkout.
  phone: text("phone"),
  role: roleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export type User = typeof users.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];

// --- Orders ---
// Legacy gateway status (kept for the shelved SSLCommerz/fake flow).
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "failed", "cancelled"]);

// Fulfilment lifecycle (drives the 5d admin).
export const orderLifecycleEnum = pgEnum("order_lifecycle", [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);

// Payment state, independent of fulfilment.
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "awaiting_verification",
  "paid",
  "rejected",
]);

// cod/bkash/nagad are the live methods; fake/sslcommerz remain valid for the
// shelved gateway adapters.
export const paymentMethodEnum = pgEnum("payment_method", [
  "cod",
  "bkash",
  "nagad",
  "fake",
  "sslcommerz",
]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  // Unique transaction id (gateway lookup key / internal reference).
  tranId: text("tran_id").notNull().unique(),
  // Opaque, unguessable token for the confirmation URL (IDOR-safe).
  accessToken: text("access_token").notNull().unique(),
  userId: text("user_id"), // nullable — guest checkout allowed
  // Originating cart, so finalize can clear it without a cookie (e.g. IPN).
  cartId: integer("cart_id"),
  // Legacy gateway status; manual methods use orderStatus/paymentStatus below.
  status: orderStatusEnum("status").notNull().default("pending"),
  orderStatus: orderLifecycleEnum("order_status").notNull().default("pending"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
  subtotalMinor: integer("subtotal_minor").notNull(),
  shippingMinor: integer("shipping_minor").notNull(),
  totalMinor: integer("total_minor").notNull(),
  // Shipping (Bangladesh).
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  area: text("area").notNull(),
  city: text("city").notNull(),
  postcode: text("postcode"),
  // Optional — BD customers are phone-first; receipt email sent only if given.
  customerEmail: text("customer_email"),
  paymentRef: text("payment_ref"),
  // Manual MFS: customer-entered transaction id + stored screenshot key.
  trxId: text("trx_id"),
  screenshotKey: text("screenshot_key"),
  // Set once stock has been decremented, so restore is idempotent.
  stockDecremented: boolean("stock_decremented").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Lifecycle timestamps (set by the admin transitions).
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  variantId: integer("variant_id")
    .notNull()
    .references(() => productVariants.id),
  productName: text("product_name").notNull(),
  size: sizeEnum("size").notNull(),
  // Price snapshot at order time (poisha).
  unitPriceMinor: integer("unit_price_minor").notNull(),
  quantity: integer("quantity").notNull(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderLifecycle = (typeof orderLifecycleEnum.enumValues)[number];
export type PaymentStatusValue = (typeof paymentStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
