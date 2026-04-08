import type {
  InventoryItem,
  InventoryItemDraft,
  LabSnapshot,
  Order,
  OrderDraft,
  Protocol,
  ProtocolDraft,
  SnapshotEvent,
} from '@/lib/types';

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function resolveApiBase() {
  const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim();

  if (explicitBase) {
    return explicitBase.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const origin = window.location.origin;

  if (origin.startsWith('http://') || origin.startsWith('https://')) {
    return origin.replace(/\/$/, '');
  }

  return '';
}

const API_BASE = resolveApiBase();

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE && typeof window !== 'undefined') {
    const origin = window.location.origin;

    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      throw new Error(
        'No API server is configured for the native app. Set VITE_API_BASE_URL before building Capacitor.',
      );
    }
  }

  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      let message = '共有サーバーへのリクエストに失敗しました。';

      if (contentType.includes('application/json')) {
        const payload = (await response.json()) as { message?: string };
        if (payload.message) {
          message = payload.message;
        }
      } else {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }

      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new Error(
      '共有サーバーに接続できません。`npm run start` または `npm run dev:server` を起動してください。',
    );
  }
}

function writeJson<T>(path: string, method: 'POST' | 'PUT', payload: unknown) {
  return request<T>(path, {
    method,
    body: JSON.stringify(payload),
  });
}

export const storageAPI = {
  getSnapshot: () => request<LabSnapshot>('/api/snapshot'),
  getInventory: () => request<InventoryItem[]>('/api/inventory'),
  createInventoryItem: (payload: InventoryItemDraft) => writeJson<InventoryItem>('/api/inventory', 'POST', payload),
  updateInventoryItem: (id: string, payload: InventoryItemDraft) =>
    writeJson<InventoryItem>(`/api/inventory/${id}`, 'PUT', payload),
  deleteInventoryItem: (id: string) => request<{ success: true }>(`/api/inventory/${id}`, { method: 'DELETE' }),
  getOrders: () => request<Order[]>('/api/orders'),
  createOrder: (payload: OrderDraft) => writeJson<Order>('/api/orders', 'POST', payload),
  updateOrder: (id: string, payload: OrderDraft) => writeJson<Order>(`/api/orders/${id}`, 'PUT', payload),
  deleteOrder: (id: string) => request<{ success: true }>(`/api/orders/${id}`, { method: 'DELETE' }),
  getProtocols: () => request<Protocol[]>('/api/protocols'),
  createProtocol: (payload: ProtocolDraft) => writeJson<Protocol>('/api/protocols', 'POST', payload),
  updateProtocol: (id: string, payload: ProtocolDraft) =>
    writeJson<Protocol>(`/api/protocols/${id}`, 'PUT', payload),
  deleteProtocol: (id: string) => request<{ success: true }>(`/api/protocols/${id}`, { method: 'DELETE' }),
  subscribeToChanges: (onMessage: (event: SnapshotEvent) => void) => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      return () => undefined;
    }

    const source = new window.EventSource(`${API_BASE}/api/events`);
    source.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data) as SnapshotEvent);
      } catch {
        return;
      }
    };

    return () => {
      source.close();
    };
  },
};
