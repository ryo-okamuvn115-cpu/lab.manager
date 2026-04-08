import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Inventory table
export const inventory = mysqlTable("inventory", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["protein", "antibody", "reagent", "other"]).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }).notNull(),
  catalogNumber: varchar("catalogNumber", { length: 255 }),
  quantity: int("quantity").notNull().default(0),
  unit: varchar("unit", { length: 50 }).default("個").notNull(),
  storageLocation: varchar("storageLocation", { length: 255 }),
  storageLocationImageUrl: varchar("storageLocationImageUrl", { length: 1024 }),
  storageLocationImageKey: varchar("storageLocationImageKey", { length: 255 }),
  expiryDate: timestamp("expiryDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = typeof inventory.$inferInsert;

// Orders table
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "received"]).default("draft").notNull(),
  totalAmount: int("totalAmount").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Order items table
export const orderItems = mysqlTable("orderItems", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderId: varchar("orderId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  catalogNumber: varchar("catalogNumber", { length: 255 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  quantity: int("quantity").notNull().default(1),
  unitPrice: int("unitPrice").notNull().default(0),
  unit: varchar("unit", { length: 50 }).default("個").notNull(),
  purpose: text("purpose"),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// Protocols table
export const protocols = mysqlTable("protocols", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Protocol = typeof protocols.$inferSelect;
export type InsertProtocol = typeof protocols.$inferInsert;

// Protocol steps table
export const protocolSteps = mysqlTable("protocolSteps", {
  id: varchar("id", { length: 64 }).primaryKey(),
  protocolId: varchar("protocolId", { length: 64 }).notNull(),
  stepNumber: int("stepNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  duration: varchar("duration", { length: 100 }),
  notes: text("notes"),
});

export type ProtocolStep = typeof protocolSteps.$inferSelect;
export type InsertProtocolStep = typeof protocolSteps.$inferInsert;

// Protocol reagents table
export const protocolReagents = mysqlTable("protocolReagents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  protocolId: varchar("protocolId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type ProtocolReagent = typeof protocolReagents.$inferSelect;
export type InsertProtocolReagent = typeof protocolReagents.$inferInsert;

// Protocol equipment table
export const protocolEquipment = mysqlTable("protocolEquipment", {
  id: varchar("id", { length: 64 }).primaryKey(),
  protocolId: varchar("protocolId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});

export type ProtocolEquipment = typeof protocolEquipment.$inferSelect;
export type InsertProtocolEquipment = typeof protocolEquipment.$inferInsert;
