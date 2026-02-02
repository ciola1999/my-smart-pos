// src/db/schema.ts

import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  decimal,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- ENUMS ---
export const roleEnum = pgEnum("role", ["admin", "cashier"]);
export const orderTypeEnum = pgEnum("order_type", ["dine_in", "take_away"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "debit",
  "qris",
  "split",
]);
export const discountTypeEnum = pgEnum("discount_type", ["PERCENTAGE", "FIXED"]);

// --- USERS ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: roleEnum("role").default("cashier").notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- CATEGORIES ---
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 120 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- PRODUCTS ---
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  barcode: varchar("barcode", { length: 50 }).unique(),
  sku: varchar("sku", { length: 50 }).unique(),
  // Konsisten Decimal
  price: decimal("price", { precision: 15, scale: 2 }).notNull().default("0"),
  costPrice: decimal("cost_price", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- MEMBERS ---
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).unique().notNull(),
  email: text("email"),
  points: integer("points").default(0),
  tier: text("tier").default("Silver"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- DISCOUNTS ---
export const discounts = pgTable("discounts", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  type: discountTypeEnum("type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
});

// --- TAXES ---
export const taxes = pgTable("taxes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- ORDERS ---
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id, {
    onDelete: "set null",
  }),
  discountId: integer("discount_id").references(() => discounts.id, {
    onDelete: "set null",
  }),
  cashierId: integer("cashier_id").references(() => users.id),
  
  // FIXED: Menggunakan Decimal agar konsisten dengan Product
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  
  taxNameSnapshot: text("tax_name_snapshot"),
  taxRateSnapshot: decimal("tax_rate_snapshot", { precision: 5, scale: 2 }),
  
  orderType: orderTypeEnum("order_type").default("dine_in").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  
  // FIXED: Decimal
  amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).notNull(),
  change: decimal("change", { precision: 15, scale: 2 }).notNull().default("0"),
  
  tableNumber: text("table_number"),
  customerName: text("customer_name"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  queueNumber: integer("queue_number").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- ORDER ITEMS ---
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot"),
  quantity: integer("quantity").notNull(),
  // FIXED: Decimal
  priceAtTime: decimal("price_at_time", { precision: 15, scale: 2 }).notNull(),
  costPriceAtTime: decimal("cost_price_at_time", {
    precision: 15,
    scale: 2,
  }).default("0"),
});

// --- ORDER PAYMENTS ---
export const orderPayments = pgTable("order_payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  paymentMethod: text("payment_method").notNull(),
  // FIXED: Decimal
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- STORE SETTINGS ---
export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Toko Saya"),
  description: text("description"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: text("email"),
  website: text("website"),
  logoUrl: text("logo_url"),
  currency: varchar("currency", { length: 3 }).default("IDR"),
  receiptFooter: text("receipt_footer").default("Terima kasih telah berbelanja!"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// --- RELATIONS ---
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payments: many(orderPayments),
  cashier: one(users, {
    fields: [orders.cashierId],
    references: [users.id],
  }),
  member: one(members, {
    fields: [orders.memberId],
    references: [members.id],
  }),
  discount: one(discounts, {
    fields: [orders.discountId],
    references: [discounts.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const orderPaymentsRelations = relations(orderPayments, ({ one }) => ({
  order: one(orders, {
    fields: [orderPayments.orderId],
    references: [orders.id],
  }),
}));

export type Member = typeof members.$inferSelect; // Type Baru
