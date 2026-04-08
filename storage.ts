import type { InventoryItem, Order, Protocol } from '../types';

const STORAGE_KEYS = {
  INVENTORY: 'lab-manager-inventory',
  ORDERS: 'lab-manager-orders',
  PROTOCOLS: 'lab-manager-protocols',
};

// 初期データ
const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'ウシ血清アルブミン (BSA)',
    category: 'protein',
    quantity: 50,
    unit: 'mg',
    minQuantity: 10,
    expiryDate: '2025-12-31',
    location: '冷蔵庫 A1',
    notes: 'タンパク質定量用',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'マウス抗ヒトβアクチン抗体',
    category: 'antibody',
    quantity: 5,
    unit: 'mL',
    minQuantity: 2,
    expiryDate: '2025-06-30',
    location: '冷凍庫 B2',
    notes: 'Western blot用',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'ウサギ抗マウスIgG (HRP)',
    category: 'antibody',
    quantity: 3,
    unit: 'mL',
    minQuantity: 1,
    expiryDate: '2025-08-15',
    location: '冷凍庫 B3',
    notes: '二次抗体',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'ヤギ抗ウサギIgG (FITC)',
    category: 'antibody',
    quantity: 2,
    unit: 'mL',
    minQuantity: 1,
    expiryDate: '2025-07-20',
    location: '冷凍庫 B4',
    notes: '蛍光標識用',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'DMEM培地',
    category: 'reagent',
    quantity: 2,
    unit: 'L',
    minQuantity: 1,
    expiryDate: '2025-05-10',
    location: '冷蔵庫 A2',
    notes: '細胞培養用',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2026-001',
    items: [
      { id: '1', itemName: 'PBS (10x)', quantity: 1, unitPrice: 5000, totalPrice: 5000 },
      { id: '2', itemName: 'Tris-HCl pH 8.0', quantity: 2, unitPrice: 3000, totalPrice: 6000 },
    ],
    totalAmount: 11000,
    status: 'approved',
    notes: 'バッファー類',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    orderNumber: 'ORD-2026-002',
    items: [
      { id: '1', itemName: 'マウス抗ヒトβアクチン抗体', quantity: 1, unitPrice: 25000, totalPrice: 25000 },
    ],
    totalAmount: 25000,
    status: 'submitted',
    notes: '免疫染色用',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const INITIAL_PROTOCOLS: Protocol[] = [
  {
    id: '1',
    title: 'Western Blot',
    category: 'タンパク質解析',
    description: 'SDS-PAGEを用いたタンパク質の分離と検出',
    steps: [
      {
        stepNumber: 1,
        title: 'サンプル調製',
        description: 'タンパク質サンプルをローディングバッファーで希釈',
        materials: ['サンプル', 'ローディングバッファー', 'マイクロチューブ'],
        duration: '10分',
      },
      {
        stepNumber: 2,
        title: 'ゲル電気泳動',
        description: 'SDS-PAGEゲルでサンプルを分離',
        materials: ['SDS-PAGEゲル', '電気泳動装置', '電源装置'],
        duration: '90分',
      },
      {
        stepNumber: 3,
        title: 'メンブレン転写',
        description: 'ゲルからニトロセルロースメンブレンへタンパク質を転写',
        materials: ['ニトロセルロースメンブレン', '転写バッファー', 'スポンジ'],
        duration: '60分',
      },
    ],
    estimatedTime: '3-4時間',
    difficulty: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'ELISA',
    category: 'タンパク質定量',
    description: '酵素結合免疫吸着測定法によるタンパク質検出',
    steps: [
      {
        stepNumber: 1,
        title: 'プレートコーティング',
        description: '96ウェルプレートに抗体をコーティング',
        materials: ['96ウェルプレート', 'コーティング抗体', 'コーティングバッファー'],
        duration: '2時間',
      },
      {
        stepNumber: 2,
        title: 'ブロッキング',
        description: 'プレートをブロッキング液で処理',
        materials: ['ブロッキング液', 'インキュベーター'],
        duration: '1時間',
      },
    ],
    estimatedTime: '4-5時間',
    difficulty: 'easy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'PCR',
    category: 'DNA増幅',
    description: 'ポリメラーゼ連鎖反応によるDNA増幅',
    steps: [
      {
        stepNumber: 1,
        title: 'PCRミックス調製',
        description: 'テンプレートDNA、プライマー、dNTP、Taqポリメラーゼを混合',
        materials: ['テンプレートDNA', 'プライマー', 'dNTP', 'Taqポリメラーゼ', 'PCRバッファー'],
        duration: '15分',
      },
      {
        stepNumber: 2,
        title: 'PCR反応',
        description: 'サーマルサイクラーで増幅反応を実施',
        materials: ['サーマルサイクラー', 'PCRチューブ'],
        duration: '120分',
      },
    ],
    estimatedTime: '2-3時間',
    difficulty: 'easy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: '免疫染色',
    category: '細胞染色',
    description: '抗体を用いた細胞内タンパク質の可視化',
    steps: [
      {
        stepNumber: 1,
        title: 'サンプル固定',
        description: '細胞を4%パラホルムアルデヒドで固定',
        materials: ['パラホルムアルデヒド', 'PBS', 'スライドガラス'],
        duration: '20分',
      },
      {
        stepNumber: 2,
        title: '一次抗体反応',
        description: '目的タンパク質に対する一次抗体を反応',
        materials: ['一次抗体', '抗体希釈液'],
        duration: '60分',
      },
    ],
    estimatedTime: '3-4時間',
    difficulty: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'DNA抽出',
    category: 'DNA精製',
    description: '細胞からのDNA抽出と精製',
    steps: [
      {
        stepNumber: 1,
        title: '細胞溶解',
        description: '細胞を溶解バッファーで処理',
        materials: ['溶解バッファー', '細胞サンプル'],
        duration: '30分',
      },
      {
        stepNumber: 2,
        title: 'DNA沈澱',
        description: 'エタノール沈澱によるDNA回収',
        materials: ['エタノール', 'イソプロパノール'],
        duration: '20分',
      },
    ],
    estimatedTime: '2時間',
    difficulty: 'easy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ストレージ操作関数
export const storageAPI = {
  // Inventory
  getInventory: (): InventoryItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return data ? JSON.parse(data) : INITIAL_INVENTORY;
  },
  setInventory: (items: InventoryItem[]): void => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
  },
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): InventoryItem => {
    const items = storageAPI.getInventory();
    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newItem);
    storageAPI.setInventory(items);
    return newItem;
  },
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>): InventoryItem | null => {
    const items = storageAPI.getInventory();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    storageAPI.setInventory(items);
    return items[index];
  },
  deleteInventoryItem: (id: string): boolean => {
    const items = storageAPI.getInventory();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    storageAPI.setInventory(filtered);
    return true;
  },

  // Orders
  getOrders: (): Order[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : INITIAL_ORDERS;
  },
  setOrders: (orders: Order[]): void => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order => {
    const orders = storageAPI.getOrders();
    const newOrder: Order = {
      ...order,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.push(newOrder);
    storageAPI.setOrders(orders);
    return newOrder;
  },
  updateOrder: (id: string, updates: Partial<Order>): Order | null => {
    const orders = storageAPI.getOrders();
    const index = orders.findIndex((order) => order.id === id);
    if (index === -1) return null;
    orders[index] = { ...orders[index], ...updates, updatedAt: new Date().toISOString() };
    storageAPI.setOrders(orders);
    return orders[index];
  },
  deleteOrder: (id: string): boolean => {
    const orders = storageAPI.getOrders();
    const filtered = orders.filter((order) => order.id !== id);
    if (filtered.length === orders.length) return false;
    storageAPI.setOrders(filtered);
    return true;
  },

  // Protocols
  getProtocols: (): Protocol[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROTOCOLS);
    return data ? JSON.parse(data) : INITIAL_PROTOCOLS;
  },
  setProtocols: (protocols: Protocol[]): void => {
    localStorage.setItem(STORAGE_KEYS.PROTOCOLS, JSON.stringify(protocols));
  },
  addProtocol: (protocol: Omit<Protocol, 'id' | 'createdAt' | 'updatedAt'>): Protocol => {
    const protocols = storageAPI.getProtocols();
    const newProtocol: Protocol = {
      ...protocol,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    protocols.push(newProtocol);
    storageAPI.setProtocols(protocols);
    return newProtocol;
  },
  updateProtocol: (id: string, updates: Partial<Protocol>): Protocol | null => {
    const protocols = storageAPI.getProtocols();
    const index = protocols.findIndex((protocol) => protocol.id === id);
    if (index === -1) return null;
    protocols[index] = { ...protocols[index], ...updates, updatedAt: new Date().toISOString() };
    storageAPI.setProtocols(protocols);
    return protocols[index];
  },
  deleteProtocol: (id: string): boolean => {
    const protocols = storageAPI.getProtocols();
    const filtered = protocols.filter((protocol) => protocol.id !== id);
    if (filtered.length === protocols.length) return false;
    storageAPI.setProtocols(filtered);
    return true;
  },
};
