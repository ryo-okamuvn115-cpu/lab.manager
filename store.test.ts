import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const storage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete storage[key]; }),
  },
}));

// Mock expo-haptics
vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: "Light" },
}));

import {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getOrders,
  addOrder,
  updateOrder,
  deleteOrder,
  getProtocols,
  addProtocol,
  deleteProtocol,
} from "../lib/store";

describe("Inventory Store", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it("starts with sample data", async () => {
    const items = await getInventory();
    expect(items.length).toBeGreaterThan(0);
  });

  it("adds a new inventory item", async () => {
    const before = await getInventory();
    await addInventoryItem({
      name: "Test Protein",
      type: "protein",
      manufacturer: "TestCo",
      catalogNumber: "TP-001",
      quantity: 5,
      unit: "vial",
      storageLocation: "-80°C",
      expiryDate: null,
      notes: "",
    });
    const after = await getInventory();
    expect(after.length).toBe(before.length + 1);
    const added = after.find((i) => i.name === "Test Protein");
    expect(added).toBeDefined();
    expect(added?.manufacturer).toBe("TestCo");
  });

  it("updates an inventory item", async () => {
    const items = await getInventory();
    const first = items[0];
    await updateInventoryItem(first.id, { quantity: 99 });
    const updated = (await getInventory()).find((i) => i.id === first.id);
    expect(updated?.quantity).toBe(99);
  });

  it("deletes an inventory item", async () => {
    const items = await getInventory();
    const first = items[0];
    await deleteInventoryItem(first.id);
    const remaining = await getInventory();
    expect(remaining.find((i) => i.id === first.id)).toBeUndefined();
  });
});

describe("Orders Store", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it("starts with sample data", async () => {
    const orders = await getOrders();
    expect(orders.length).toBeGreaterThan(0);
  });

  it("adds a new order and calculates total", async () => {
    const before = await getOrders();
    await addOrder({
      title: "Test Order",
      status: "draft",
      items: [
        { id: "i1", name: "Reagent A", catalogNumber: "R-001", manufacturer: "Co", quantity: 2, unitPrice: 5000, unit: "本", purpose: "" },
        { id: "i2", name: "Reagent B", catalogNumber: "R-002", manufacturer: "Co", quantity: 1, unitPrice: 10000, unit: "個", purpose: "" },
      ],
      notes: "",
    });
    const after = await getOrders();
    expect(after.length).toBe(before.length + 1);
    const added = after.find((o) => o.title === "Test Order");
    expect(added).toBeDefined();
    expect(added?.totalAmount).toBe(20000);
    expect(added?.status).toBe("draft");
  });

  it("updates order status", async () => {
    const orders = await getOrders();
    const first = orders[0];
    await updateOrder(first.id, { status: "approved" });
    const updated = (await getOrders()).find((o) => o.id === first.id);
    expect(updated?.status).toBe("approved");
  });

  it("deletes an order", async () => {
    const orders = await getOrders();
    const first = orders[0];
    await deleteOrder(first.id);
    const remaining = await getOrders();
    expect(remaining.find((o) => o.id === first.id)).toBeUndefined();
  });
});

describe("Protocols Store", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it("starts with sample data", async () => {
    const protocols = await getProtocols();
    expect(protocols.length).toBeGreaterThan(0);
  });

  it("adds a new protocol", async () => {
    const before = await getProtocols();
    await addProtocol({
      title: "Test Protocol",
      category: "その他",
      description: "A test protocol",
      steps: [
        { id: "s1", stepNumber: 1, title: "Step 1", description: "Do something", duration: "10分", notes: "" },
      ],
      reagents: ["Reagent A"],
      equipment: ["Equipment B"],
      notes: "",
    });
    const after = await getProtocols();
    expect(after.length).toBe(before.length + 1);
    const added = after.find((p) => p.title === "Test Protocol");
    expect(added).toBeDefined();
    expect(added?.steps.length).toBe(1);
    expect(added?.reagents).toContain("Reagent A");
  });

  it("deletes a protocol", async () => {
    const protocols = await getProtocols();
    const first = protocols[0];
    await deleteProtocol(first.id);
    const remaining = await getProtocols();
    expect(remaining.find((p) => p.id === first.id)).toBeUndefined();
  });
});
