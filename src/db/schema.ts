import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Catalog ──────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    details: text("details").notNull().default(""),
    categorySlug: text("category_slug").notNull().default("living"),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    colors: text("colors").array().notNull().default([]),
    materials: text("materials").notNull().default(""),
    dimensions: text("dimensions").notNull().default(""),
    flatPack: boolean("flat_pack").notNull().default(true),
    imageUrls: text("image_urls").array().notNull().default([]),
    badges: text("badges").array().notNull().default([]),
    isNew: boolean("is_new").notNull().default(false),
    isBestseller: boolean("is_bestseller").notNull().default(false),
    stockTotal: integer("stock_total").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("products_slug_idx").on(t.slug)],
);

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  hours: text("hours").notNull().default(""),
  phone: text("phone").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  storeSlug: text("store_slug").notNull().default("tampines"),
  quantity: integer("quantity").notNull().default(0),
  aisleBin: text("aisle_bin").notNull().default(""),
});

// ── Orders ───────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  postal: text("postal").notNull().default(""),
  deliveryMethod: text("delivery_method").notNull().default("delivery"),
  deliverySlot: text("delivery_slot").notNull().default(""),
  storeSlug: text("store_slug").notNull().default("tampines"),
  paymentMethod: text("payment_method").notNull().default("card"),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  discountCents: integer("discount_cents").notNull().default(0),
  deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
  gstCents: integer("gst_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull().default(0),
  status: text("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().default(0),
  name: text("name").notNull(),
  sku: text("sku").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  unitPriceCents: integer("unit_price_cents").notNull(),
  qty: integer("qty").notNull(),
});

// ── Social proof / content ───────────────────────────────
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  rating: integer("rating").notNull(),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inspirations = pgTable("inspirations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  room: text("room").notNull().default("Living room"),
  sqm: integer("sqm").notNull().default(0),
  budgetCents: integer("budget_cents").notNull().default(0),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  productSlugs: text("product_slugs").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  kind: text("kind").notNull().default("percent"),
  value: integer("value").notNull().default(10),
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Inspiration = typeof inspirations.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
