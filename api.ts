import axios from 'axios';
import type { InventoryItem, Order, Protocol } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inventory API
export const inventoryAPI = {
  getAll: async (): Promise<InventoryItem[]> => {
    const response = await apiClient.get('/inventory');
    return response.data;
  },
  getById: async (id: string): Promise<InventoryItem> => {
    const response = await apiClient.get(`/inventory/${id}`);
    return response.data;
  },
  create: async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> => {
    const response = await apiClient.post('/inventory', item);
    return response.data;
  },
  update: async (id: string, item: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await apiClient.put(`/inventory/${id}`, item);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory/${id}`);
  },
};

// Order API
export const orderAPI = {
  getAll: async (): Promise<Order[]> => {
    const response = await apiClient.get('/orders');
    return response.data;
  },
  getById: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },
  create: async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> => {
    const response = await apiClient.post('/orders', order);
    return response.data;
  },
  update: async (id: string, order: Partial<Order>): Promise<Order> => {
    const response = await apiClient.put(`/orders/${id}`, order);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/orders/${id}`);
  },
};

// Protocol API
export const protocolAPI = {
  getAll: async (): Promise<Protocol[]> => {
    const response = await apiClient.get('/protocols');
    return response.data;
  },
  getById: async (id: string): Promise<Protocol> => {
    const response = await apiClient.get(`/protocols/${id}`);
    return response.data;
  },
  create: async (protocol: Omit<Protocol, 'id' | 'createdAt' | 'updatedAt'>): Promise<Protocol> => {
    const response = await apiClient.post('/protocols', protocol);
    return response.data;
  },
  update: async (id: string, protocol: Partial<Protocol>): Promise<Protocol> => {
    const response = await apiClient.put(`/protocols/${id}`, protocol);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/protocols/${id}`);
  },
};
