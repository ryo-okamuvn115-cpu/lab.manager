import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * Create a standalone tRPC client for use outside of React components.
 */
function createStandaloneTRPCClient() {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}

/**
 * Synchronize local data with server on app startup.
 * Fetches server data and merges with local AsyncStorage.
 */
export async function syncDataWithServer() {
  try {
    const client = createStandaloneTRPCClient();

    // Fetch all data from server
    const [serverInventory, serverOrders, serverProtocols] = await Promise.all([
      client.inventory.list.query().catch(() => []),
      client.orders.list.query().catch(() => []),
      client.protocols.list.query().catch(() => []),
    ]);

    // Save to AsyncStorage
    await Promise.all([
      AsyncStorage.setItem("inventory", JSON.stringify(serverInventory || [])),
      AsyncStorage.setItem("orders", JSON.stringify(serverOrders || [])),
      AsyncStorage.setItem("protocols", JSON.stringify(serverProtocols || [])),
    ]);

    console.log("[Sync] Data synchronized successfully");
    return true;
  } catch (error) {
    console.error("[Sync] Failed to sync data:", error);
    return false;
  }
}

/**
 * Upload local changes to server.
 * Call this after creating/updating/deleting items locally.
 */
export async function uploadLocalChanges() {
  try {
    const client = createStandaloneTRPCClient();

    const [localInventory, localOrders, localProtocols] = await Promise.all([
      AsyncStorage.getItem("inventory"),
      AsyncStorage.getItem("orders"),
      AsyncStorage.getItem("protocols"),
    ]);

    const inventory = localInventory ? JSON.parse(localInventory) : [];
    const orders = localOrders ? JSON.parse(localOrders) : [];
    const protocols = localProtocols ? JSON.parse(localProtocols) : [];

    // Sync inventory
    for (const item of inventory) {
      try {
        await client.inventory.create.mutate(item);
      } catch (e) {
        // Item may already exist on server, skip
      }
    }

    // Sync orders
    for (const order of orders) {
      try {
        await client.orders.create.mutate(order);
      } catch (e) {
        // Order may already exist on server, skip
      }
    }

    // Sync protocols
    for (const protocol of protocols) {
      try {
        await client.protocols.create.mutate(protocol);
      } catch (e) {
        // Protocol may already exist on server, skip
      }
    }

    console.log("[Sync] Local changes uploaded");
    return true;
  } catch (error) {
    console.error("[Sync] Failed to upload changes:", error);
    return false;
  }
}

/**
 * Clear all local data (for logout).
 */
export async function clearLocalData() {
  try {
    await Promise.all([
      AsyncStorage.removeItem("inventory"),
      AsyncStorage.removeItem("orders"),
      AsyncStorage.removeItem("protocols"),
    ]);
    console.log("[Sync] Local data cleared");
  } catch (error) {
    console.error("[Sync] Failed to clear local data:", error);
  }
}
