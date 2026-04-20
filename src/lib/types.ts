export type Page = 'home' | 'inventory' | 'orders' | 'protocols' | 'admin';

export type InventoryCategory = 'protein' | 'antibody' | 'reagent' | 'plasmid' | 'other';
export type InventorySupplier = 'tone-kagaku' | 'ikeda-rika' | 'yaken' | 'ut' | 'other';
export type OrderStatus = 'draft' | 'submitted' | 'approved' | 'received';
export type ProtocolDifficulty = 'easy' | 'medium' | 'hard';
export type WorkspaceRole = 'member' | 'admin';

export const INVENTORY_LOCATION_PRESETS = [
  '-30℃冷凍庫(白色)',
  '-30℃冷凍庫（番号34）',
  '-30℃冷凍庫（番号35）',
  '-30℃冷凍庫（番号36）',
  '-30℃冷凍庫（番号37）',
  '-80℃冷凍庫44',
  '-80℃冷凍庫45',
  '-80℃冷凍庫46',
  '4℃冷蔵庫（番号16）',
  '4℃冷蔵庫（番号17）',
  '4℃冷蔵庫（番号31）',
  '4℃冷蔵庫（番号32）',
  '4℃冷蔵庫（番号33）',
  '4℃冷蔵庫（番号4、培養室）',
  '4℃冷蔵庫（番号5、培養室）',
  '共通試薬棚（培養室前）',
  '外劇物保管棚（ブルー）',
  '液体窒素A',
  '液体窒素B',
  '液体窒素C',
  '液体窒素D',
  '液体窒素E',
  '鍵付きボックス（ビール瓶の鍵）',
] as const;

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  minQuantity: number;
  expiryDate: string | null;
  supplier: InventorySupplier;
  location: string;
  locationPreset: string;
  locationFieldValues: InventoryLocationFieldValue[];
  locationDetail: string;
  locationImagePath: string;
  locationImageUrl: string | null;
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
  supplier: InventorySupplier;
  locationPreset: string;
  locationFieldValues: InventoryLocationFieldValue[];
  locationDetail: string;
  locationImagePath: string;
  locationImageUrl: string | null;
  notes: string;
}

export interface StorageLocationDetailField {
  id: string;
  label: string;
  options: string[];
}

export interface InventoryLocationFieldValue {
  fieldId: string;
  value: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  details: string;
  detailFields: StorageLocationDetailField[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageLocationDraft {
  name: string;
  details: string;
  detailFields: StorageLocationDetailField[];
  sortOrder: number;
  isActive: boolean;
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
  storageLocations: StorageLocation[];
  orders: Order[];
  protocols: Protocol[];
  updatedAt: string | null;
}

export interface WorkspaceAccess {
  allowed: boolean;
  role: WorkspaceRole | null;
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
  'plasmid',
  'other',
];

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory | 'all', string> = {
  all: 'すべて',
  protein: 'タンパク質',
  antibody: '抗体',
  reagent: '試薬',
  plasmid: 'プラスミド',
  other: 'その他',
};

export const INVENTORY_SUPPLIERS: InventorySupplier[] = [
  'tone-kagaku',
  'ikeda-rika',
  'yaken',
  'ut',
  'other',
];

export const INVENTORY_SUPPLIER_LABELS: Record<InventorySupplier, string> = {
  'tone-kagaku': '利根化学',
  'ikeda-rika': '池田理化',
  yaken: '薬研社',
  ut: 'UT',
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

export function createStorageLocationDetailField(
  label = '',
  options: string[] = [],
): StorageLocationDetailField {
  return {
    id:
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    label,
    options,
  };
}

export function buildInventoryLocation(
  locationPreset: string,
  locationFieldValues: InventoryLocationFieldValue[] = [],
  locationDetail = '',
) {
  const preset = locationPreset.trim();
  const detailParts = locationFieldValues.map((field) => field.value.trim()).filter(Boolean);
  const freeText = locationDetail.trim();
  const detail = [...detailParts, freeText].filter(Boolean).join(' / ');

  if (preset && detail) {
    return `${preset} / ${detail}`;
  }

  return preset || detail;
}

export function createEmptyInventoryDraft(): InventoryItemDraft {
  return {
    name: '',
    category: 'reagent',
    quantity: 1,
    unit: '本',
    minQuantity: 1,
    expiryDate: '',
    supplier: 'other',
    locationPreset: '',
    locationFieldValues: [],
    locationDetail: '',
    locationImagePath: '',
    locationImageUrl: null,
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

export function createEmptyStorageLocationDraft(): StorageLocationDraft {
  return {
    name: '',
    details: '',
    detailFields: [],
    sortOrder: 0,
    isActive: true,
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
