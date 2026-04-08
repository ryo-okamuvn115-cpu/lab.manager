export interface InventoryItem {
  id: string;
  name: string;
  category: 'protein' | 'antibody' | 'reagent' | 'other';
  quantity: number;
  unit: string;
  minQuantity: number;
  expiryDate: string;
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
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
  status: 'draft' | 'submitted' | 'approved' | 'received';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolStep {
  stepNumber: number;
  title: string;
  description: string;
  materials?: string[];
  duration?: string;
}

export interface Protocol {
  id: string;
  title: string;
  category: string;
  description: string;
  steps: ProtocolStep[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  updatedAt: string;
}
