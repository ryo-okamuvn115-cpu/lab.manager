export type Page = 'home' | 'inventory' | 'orders' | 'protocols';

export type InventoryCategory = 'protein' | 'antibody' | 'reagent' | 'other';
export type OrderStatus = 'draft' | 'submitted' | 'approved' | 'received';
export type ProtocolDifficulty = 'easy' | 'medium' | 'hard';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  minQuantity: number;
  expiryDate: string | null;
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemDraft {
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  minQuantity: number;
  expiryDate: string;
  location: string;
  notes: string;
}

export interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemDraft {
  itemName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderDraft {
  orderNumber: string;
  status: OrderStatus;
  notes: string;
  items: OrderItemDraft[];
}

export interface ProtocolStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  materials: string[];
  duration: string;
}

export interface Protocol {
  id: string;
  title: string;
  category: string;
  description: string;
  steps: ProtocolStep[];
  estimatedTime: string;
  difficulty: ProtocolDifficulty;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolStepDraft {
  title: string;
  description: string;
  materials: string[];
  duration: string;
}

export interface ProtocolDraft {
  title: string;
  category: string;
  description: string;
  estimatedTime: string;
  difficulty: ProtocolDifficulty;
  steps: ProtocolStepDraft[];
}

export interface LabSnapshot {
  inventory: InventoryItem[];
  orders: Order[];
  protocols: Protocol[];
  updatedAt: string;
}

export interface SnapshotEvent {
  type: 'snapshot-updated';
  updatedAt: string;
}

export const INVENTORY_FILTERS: Array<InventoryCategory | 'all'> = [
  'all',
  'protein',
  'antibody',
  'reagent',
  'other',
];

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory | 'all', string> = {
  all: 'すべて',
  protein: 'タンパク質',
  antibody: '抗体',
  reagent: '試薬',
  other: 'その他',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: '下書き',
  submitted: '申請済み',
  approved: '承認済み',
  received: '受領済み',
};

export const PROTOCOL_DIFFICULTY_LABELS: Record<ProtocolDifficulty, string> = {
  easy: '初級',
  medium: '中級',
  hard: '上級',
};

export const ORDER_STATUSES: OrderStatus[] = ['draft', 'submitted', 'approved', 'received'];
export const PROTOCOL_DIFFICULTIES: ProtocolDifficulty[] = ['easy', 'medium', 'hard'];

export function createEmptyInventoryDraft(): InventoryItemDraft {
  return {
    name: '',
    category: 'reagent',
    quantity: 1,
    unit: '本',
    minQuantity: 1,
    expiryDate: '',
    location: '',
    notes: '',
  };
}

export function createEmptyOrderDraft(): OrderDraft {
  return {
    orderNumber: '',
    status: 'draft',
    notes: '',
    items: [
      {
        itemName: '',
        quantity: 1,
        unitPrice: 0,
      },
    ],
  };
}

export function createEmptyProtocolDraft(): ProtocolDraft {
  return {
    title: '',
    category: '',
    description: '',
    estimatedTime: '',
    difficulty: 'medium',
    steps: [
      {
        title: '',
        description: '',
        materials: [],
        duration: '',
      },
    ],
  };
}
