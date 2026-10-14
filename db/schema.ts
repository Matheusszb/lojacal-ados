import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const admins = sqliteTable("admins", {
  userId: text("user_id").primaryKey(), email: text("email").notNull(), createdAt: text("created_at").notNull(),
});
export const settings = sqliteTable("settings", { key: text("key").primaryKey(), value: text("value").notNull() });
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(), name: text("name").notNull(), slug: text("slug").notNull().unique(),
  active: integer("active").notNull().default(1), sort: integer("sort").notNull().default(0),
});
export const products = sqliteTable("products", {
  id: text("id").primaryKey(), name: text("name").notNull(), slug: text("slug").notNull().unique(),
  brand: text("brand").notNull(), categoryId: text("category_id").references(() => categories.id),
  description: text("description").notNull().default(""), priceCents: integer("price_cents").notNull(),
  salePriceCents: integer("sale_price_cents"), active: integer("active").notNull().default(0),
  featured: integer("featured").notNull().default(0), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const variants = sqliteTable("variants", {
  id: text("id").primaryKey(), productId: text("product_id").notNull().references(() => products.id),
  sku: text("sku").notNull().unique(), color: text("color").notNull(), size: text("size").notNull(),
  stock: integer("stock").notNull().default(0), minStock: integer("min_stock").notNull().default(2),
}, (table) => [uniqueIndex("variant_color_size_unique").on(table.productId, table.color, table.size)]);
export const productImages = sqliteTable("product_images", {
  id: text("id").primaryKey(), productId: text("product_id").notNull().references(() => products.id),
  key: text("key").notNull(), alt: text("alt").notNull().default(""), sort: integer("sort").notNull().default(0),
});
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), number: integer("number").notNull().unique(),
  customerName: text("customer_name").notNull(), phone: text("phone").notNull(), fulfillment: text("fulfillment").notNull(),
  notes: text("notes").notNull().default(""), totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("pending"), source: text("source").notNull().default("online"),
  createdAt: text("created_at").notNull(), confirmedAt: text("confirmed_at"),
});
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id),
  variantId: text("variant_id").notNull().references(() => variants.id), productName: text("product_name").notNull(),
  color: text("color").notNull(), size: text("size").notNull(), quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});
export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(), variantId: text("variant_id").notNull().references(() => variants.id),
  delta: integer("delta").notNull(), reason: text("reason").notNull(), reference: text("reference").notNull().default(""),
  actorId: text("actor_id").notNull(), createdAt: text("created_at").notNull(),
});
export const banners = sqliteTable("banners", {
  id: text("id").primaryKey(), title: text("title").notNull(), subtitle: text("subtitle").notNull().default(""),
  imageKey: text("image_key"), link: text("link").notNull().default("/calcados"),
  active: integer("active").notNull().default(1), sort: integer("sort").notNull().default(0),
});
