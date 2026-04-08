import AsyncStorage from "@react-native-async-storage/async-storage";

// ==================== Types ====================

export type InventoryItemType = "protein" | "antibody" | "reagent" | "other";

export interface InventoryItem {
  id: string;
  userId: number;
  name: string;
  type: InventoryItemType;
  manufacturer: string;
  catalogNumber: string | null;
  quantity: number;
  unit: string;
  storageLocation: string | null;
  storageLocationImageUrl: string | null;
  storageLocationImageKey: string | null;
  expiryDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = "draft" | "submitted" | "approved" | "received";

export interface OrderItem {
  id: string;
  name: string;
  catalogNumber: string;
  manufacturer: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  purpose: string;
}

export interface Order {
  id: string;
  title: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface ProtocolStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  duration: string | null;
  notes: string | null;
}

export interface Protocol {
  id: string;
  title: string;
  category: string;
  description: string | null;
  steps: ProtocolStep[];
  reagents: string[];
  equipment: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== Storage Keys ====================

const KEYS = {
  INVENTORY: "lab-manager:inventory",
  ORDERS: "lab-manager:orders",
  PROTOCOLS: "lab-manager:protocols",
};

// ==================== Utility ====================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== Inventory ====================

export async function getInventory(): Promise<InventoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.INVENTORY);
    if (!raw) return getDefaultInventory();
    const parsed = JSON.parse(raw);
    return parsed.length === 0 ? getDefaultInventory() : parsed.map((item: any) => ({
      ...item,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  } catch {
    return getDefaultInventory();
  }
}

export async function saveInventory(items: InventoryItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
}

export async function addInventoryItem(
  item: Omit<InventoryItem, "id" | "userId" | "createdAt" | "updatedAt" | "storageLocationImageUrl" | "storageLocationImageKey">
): Promise<InventoryItem> {
  const items = await getInventory();
  const now = new Date();
  const newItem: InventoryItem = {
    ...item,
    id: generateId(),
    userId: 0,
    storageLocationImageUrl: null,
    storageLocationImageKey: null,
    createdAt: now,
    updatedAt: now,
  };
  await saveInventory([...items, newItem]);
  return newItem;
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Omit<InventoryItem, "id" | "createdAt">>
): Promise<void> {
  const items = await getInventory();
  const updated = items.map((item) =>
    item.id === id ? { ...item, ...updates, updatedAt: new Date() } : item
  );
  await saveInventory(updated);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const items = await getInventory();
  await saveInventory(items.filter((item) => item.id !== id));
}

// ==================== Orders ====================

export async function getOrders(): Promise<Order[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ORDERS);
    if (!raw) return getDefaultOrders();
    const parsed = JSON.parse(raw);
    return parsed.length === 0 ? getDefaultOrders() : parsed;
  } catch {
    return getDefaultOrders();
  }
}

export async function saveOrders(orders: Order[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
}

export async function addOrder(
  order: Omit<Order, "id" | "createdAt" | "updatedAt" | "totalAmount">
): Promise<Order> {
  const orders = await getOrders();
  const now = new Date().toISOString();
  const totalAmount = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const newOrder: Order = {
    ...order,
    id: generateId(),
    totalAmount,
    createdAt: now,
    updatedAt: now,
  };
  await saveOrders([...orders, newOrder]);
  return newOrder;
}

export async function updateOrder(
  id: string,
  updates: Partial<Omit<Order, "id" | "createdAt">>
): Promise<void> {
  const orders = await getOrders();
  const updated = orders.map((order) =>
    order.id === id ? { ...order, ...updates, updatedAt: new Date().toISOString() } : order
  );
  await saveOrders(updated);
}

export async function deleteOrder(id: string): Promise<void> {
  const orders = await getOrders();
  await saveOrders(orders.filter((order) => order.id !== id));
}

// ==================== Protocols ====================

export async function getProtocols(): Promise<Protocol[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROTOCOLS);
    if (!raw) return getDefaultProtocols();
    const parsed = JSON.parse(raw);
    return parsed.length === 0 ? getDefaultProtocols() : parsed;
  } catch {
    return getDefaultProtocols();
  }
}

export async function saveProtocols(protocols: Protocol[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROTOCOLS, JSON.stringify(protocols));
}

export async function addProtocol(
  protocol: Omit<Protocol, "id" | "createdAt" | "updatedAt">
): Promise<Protocol> {
  const protocols = await getProtocols();
  const now = new Date().toISOString();
  const newProtocol: Protocol = {
    ...protocol,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await saveProtocols([...protocols, newProtocol]);
  return newProtocol;
}

export async function updateProtocol(
  id: string,
  updates: Partial<Omit<Protocol, "id" | "createdAt">>
): Promise<void> {
  const protocols = await getProtocols();
  const updated = protocols.map((protocol) =>
    protocol.id === id ? { ...protocol, ...updates, updatedAt: new Date().toISOString() } : protocol
  );
  await saveProtocols(updated);
}

export async function deleteProtocol(id: string): Promise<void> {
  const protocols = await getProtocols();
  await saveProtocols(protocols.filter((protocol) => protocol.id !== id));
}

// ==================== Default Data ====================

function getDefaultInventory(): InventoryItem[] {
  const now = new Date();
  const expiryDate1 = new Date("2026-12-31");
  const expiryDate2 = new Date("2026-06-30");
  const expiryDate3 = new Date("2027-03-31");
  const expiryDate4 = new Date("2026-09-30");
  const expiryDate5 = new Date("2025-12-31");
  const expiryDate6 = new Date("2027-01-31");
  const expiryDate7 = new Date("2026-08-31");
  const expiryDate8 = new Date("2026-11-30");

  return [
    {
      id: "inv-1",
      userId: 0,
      name: "Anti-β-Actin Antibody",
      type: "antibody",
      manufacturer: "Sigma-Aldrich",
      catalogNumber: "A5441",
      quantity: 3,
      unit: "vial",
      storageLocation: "-20°C フリーザー A-2",
      storageLocationImageUrl: null,
      storageLocationImageKey: null,
      expiryDate: expiryDate1,
      notes: "WB用 1:5000希釈",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "inv-2",
      userId: 0,
      name: "Anti-GAPDH Antibody",
      type: "antibody",
      manufacturer: "Cell Signaling Technology",
      catalogNumber: "2118",
      quantity: 1,
      unit: "vial",
      storageLocation: "-20°C フリーザー A-2",
      storageLocationImageUrl: null,
      storageLocationImageKey: null,
      expiryDate: expiryDate2,
      notes: "ローディングコントロール用",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "inv-3",
      userId: 0,
      name: "Recombinant Human TNF-α",
      type: "protein",
      manufacturer: "R&D Systems",
      catalogNumber: "210-TA",
      quantity: 10,
      unit: "μg",
      storageLocation: "-80°C フリーザー B-1",
      storageLocationImageUrl: null,
      storageLocationImageKey: null,
      expiryDate: expiryDate3,
      notes: "細胞刺激用 10ng/mL推奨",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "inv-4",
      userId: 0,
      name: "Recombinant Human IL-6",
      type: "protein",
      manufacturer: "PeproTech",
      catalogNumber: "200-06",
      quantity: 5,
      unit: "μg",
      storageLocation: "-80°C フリーザー B-1",
      storageLocationImageUrl: null,
      storageLocationImageKey: null,
      expiryDate: expiryDate4,
      notes: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "inv-5",
      userId: 0,
      name: "Anti-p53 Antibody (DO-1)",
      type: "antibody",
      manufacturer: "Santa Cruz Biotechnology",
      catalogNumber: "sc-126",
      quantity: 0,
      unit: "vial",
      storageLocation: "-20°C フリーザー A-3",
      storageLocationImageUrl: null,
      storageLocationImageKey: null,
      expiryDate: expiryDate5,
      notes: "在庫切れ - 要発注",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "inv-6",
      userId: 0,
      name: "Bovine Serum Albumin (BSA)",
      type: "reagent",
      manufacturer: "Sigma-Aldrich",
      catalogNumber: "A2153",
      quantity: 50,
      unit: "g",
      storageLocation: "4°C 冷蔵庫 C-1",
      storageLocationImageUrl: null,
      storageLocationImageKey: null,
      expiryDate: expiryDate6,
      notes: "ブロッキング用 5%",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "inv-7",
      userId: 0,
      name: "Recombinant Human EGF",
      type: "protein",
      manufacturer: "Thermo Fisher",
      catalogNumber: "PHG0311",
      quantity: 2,
      unit: "μg",
      storageLocation: "-80°C フリーザー B-2",
      storageLocationImageUrl: null,
      storageLocationImageKey: null,
      expiryDate: expiryDate7,
      notes: "細胞増殖実験用",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "inv-8",
      userId: 0,
      name: "Anti-Phospho-ERK1/2 Antibody",
      type: "antibody",
      manufacturer: "Cell Signaling Technology",
      catalogNumber: "4370",
      quantity: 2,
      unit: "vial",
      storageLocation: "-20°C フリーザー A-2",
      storageLocationImageUrl: null,
      storageLocationImageKey: null,
      expiryDate: expiryDate8,
      notes: "シグナル伝達解析用",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function getDefaultOrders(): Order[] {
  const now = new Date().toISOString();
  return [
    {
      id: "ord-1",
      title: "2026年2月 試薬発注",
      status: "submitted",
      items: [
        {
          id: "item-1",
          name: "Anti-p53 Antibody (DO-1)",
          catalogNumber: "sc-126",
          manufacturer: "Santa Cruz Biotechnology",
          quantity: 2,
          unitPrice: 450,
          unit: "vial",
          purpose: "Western Blot解析",
        },
      ],
      totalAmount: 900,
      notes: "在庫切れのため緊急発注",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "ord-2",
      title: "2026年1月 タンパク質発注",
      status: "approved",
      items: [
        {
          id: "item-2",
          name: "Recombinant Human TNF-α",
          catalogNumber: "210-TA",
          manufacturer: "R&D Systems",
          quantity: 5,
          unitPrice: 280,
          unit: "μg",
          purpose: "細胞刺激実験",
        },
      ],
      totalAmount: 1400,
      notes: "",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function getDefaultProtocols(): Protocol[] {
  const now = new Date().toISOString();
  return [
    {
      id: "prot-1",
      title: "Western Blot",
      category: "タンパク質解析",
      description: "タンパク質の検出と定量",
      steps: [
        {
          id: "step-1",
          stepNumber: 1,
          title: "サンプル調製",
          description: "細胞をリシスバッファーで溶解",
          duration: "30分",
          notes: "氷上で行う",
        },
        {
          id: "step-2",
          stepNumber: 2,
          title: "タンパク質定量",
          description: "BCA法でタンパク質濃度を測定",
          duration: "1時間",
          notes: null,
        },
      ],
      reagents: ["Anti-β-Actin Antibody", "Anti-GAPDH Antibody"],
      equipment: ["SDS-PAGE装置", "転写装置"],
      notes: "標準的なWB手順",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prot-2",
      title: "ELISA",
      category: "免疫検定",
      description: "抗原抗体反応を利用した定量",
      steps: [
        {
          id: "step-3",
          stepNumber: 1,
          title: "プレートコーティング",
          description: "96ウェルプレートに抗体をコーティング",
          duration: "4時間",
          notes: "4°Cで一晩置く",
        },
      ],
      reagents: ["Bovine Serum Albumin (BSA)"],
      equipment: ["ELISA reader"],
      notes: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prot-3",
      title: "PCR",
      category: "遺伝子解析",
      description: "DNA増幅反応",
      steps: [
        {
          id: "step-4",
          stepNumber: 1,
          title: "反応液調製",
          description: "PCR反応液を調製",
          duration: "15分",
          notes: null,
        },
      ],
      reagents: [],
      equipment: ["PCR装置"],
      notes: "標準的なPCR条件",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prot-4",
      title: "細胞培養",
      category: "細胞生物学",
      description: "哺乳動物細胞の培養",
      steps: [
        {
          id: "step-5",
          stepNumber: 1,
          title: "培養皿の準備",
          description: "培養皿にコーティング液を塗布",
          duration: "30分",
          notes: null,
        },
      ],
      reagents: ["Recombinant Human EGF"],
      equipment: ["CO2インキュベーター"],
      notes: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prot-5",
      title: "免疫沈降 (IP)",
      category: "タンパク質相互作用",
      description: "特定のタンパク質を抗体で沈降",
      steps: [
        {
          id: "step-6",
          stepNumber: 1,
          title: "サンプル準備",
          description: "細胞溶解液を準備",
          duration: "30分",
          notes: null,
        },
      ],
      reagents: ["Anti-p53 Antibody (DO-1)", "Anti-Phospho-ERK1/2 Antibody"],
      equipment: ["ロテーター"],
      notes: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
