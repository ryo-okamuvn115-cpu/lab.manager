import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Inventory ============

export async function getAllInventory() {
  const db = await getDb();
  if (!db) return [];
  const { inventory } = await import("../drizzle/schema");
  return db.select().from(inventory);
}

export async function getUserInventory(userId: number) {
  return getAllInventory();
}

export async function createInventoryItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { inventory } = await import("../drizzle/schema");
  await db.insert(inventory).values(data);
}

export async function updateInventoryItem(id: string, userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { inventory } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(inventory)
    .set(data)
    .where(eq(inventory.id, id));
}

export async function deleteInventoryItem(id: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { inventory } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .delete(inventory)
    .where(eq(inventory.id, id));
}

// ============ Orders ============

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { orders } = await import("../drizzle/schema");
  return db.select().from(orders).where(eq(orders.userId, userId));
}

export async function createOrder(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orders } = await import("../drizzle/schema");
  await db.insert(orders).values(data);
}

export async function updateOrder(id: string, userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orders } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db
    .update(orders)
    .set(data)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)));
}

export async function deleteOrder(id: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orders } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db
    .delete(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)));
}

// ============ Order Items ============

export async function getOrderItems(orderId: string) {
  const db = await getDb();
  if (!db) return [];
  const { orderItems } = await import("../drizzle/schema");
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function createOrderItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orderItems } = await import("../drizzle/schema");
  await db.insert(orderItems).values(data);
}

export async function deleteOrderItems(orderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orderItems } = await import("../drizzle/schema");
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
}

// ============ Protocols ============

export async function getUserProtocols(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { protocols } = await import("../drizzle/schema");
  return db.select().from(protocols).where(eq(protocols.userId, userId));
}

export async function createProtocol(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocols } = await import("../drizzle/schema");
  await db.insert(protocols).values(data);
}

export async function updateProtocol(id: string, userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocols } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db
    .update(protocols)
    .set(data)
    .where(and(eq(protocols.id, id), eq(protocols.userId, userId)));
}

export async function deleteProtocol(id: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocols } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db
    .delete(protocols)
    .where(and(eq(protocols.id, id), eq(protocols.userId, userId)));
}

// ============ Protocol Steps ============

export async function getProtocolSteps(protocolId: string) {
  const db = await getDb();
  if (!db) return [];
  const { protocolSteps } = await import("../drizzle/schema");
  return db
    .select()
    .from(protocolSteps)
    .where(eq(protocolSteps.protocolId, protocolId));
}

export async function createProtocolStep(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolSteps } = await import("../drizzle/schema");
  await db.insert(protocolSteps).values(data);
}

export async function deleteProtocolSteps(protocolId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolSteps } = await import("../drizzle/schema");
  await db
    .delete(protocolSteps)
    .where(eq(protocolSteps.protocolId, protocolId));
}

// ============ Protocol Reagents ============

export async function getProtocolReagents(protocolId: string) {
  const db = await getDb();
  if (!db) return [];
  const { protocolReagents } = await import("../drizzle/schema");
  return db
    .select()
    .from(protocolReagents)
    .where(eq(protocolReagents.protocolId, protocolId));
}

export async function createProtocolReagent(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolReagents } = await import("../drizzle/schema");
  await db.insert(protocolReagents).values(data);
}

export async function deleteProtocolReagents(protocolId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolReagents } = await import("../drizzle/schema");
  await db
    .delete(protocolReagents)
    .where(eq(protocolReagents.protocolId, protocolId));
}

// ============ Protocol Equipment ============

export async function getProtocolEquipment(protocolId: string) {
  const db = await getDb();
  if (!db) return [];
  const { protocolEquipment } = await import("../drizzle/schema");
  return db
    .select()
    .from(protocolEquipment)
    .where(eq(protocolEquipment.protocolId, protocolId));
}

export async function createProtocolEquipment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolEquipment } = await import("../drizzle/schema");
  await db.insert(protocolEquipment).values(data);
}

export async function deleteProtocolEquipment(protocolId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { protocolEquipment } = await import("../drizzle/schema");
  await db
    .delete(protocolEquipment)
    .where(eq(protocolEquipment.protocolId, protocolId));
}
