/**
 * idb-store.ts
 *
 * IndexedDB abstraction for offline POS functionality.
 * Database: "lankacommerce_offline_db" (version 1)
 * Object stores:
 *   - cart_persist: cart snapshots keyed by storeKey
 *   - sale_queue:   queued offline sales (autoIncrement id)
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CartItem } from "@/types/pos";
import type { CreateSalePayload } from "@/types/pos";

// ──────────────────────────────────────────────────────────────────
// DB Schema
// ──────────────────────────────────────────────────────────────────

interface CartSnapshot {
  storeKey: string;
  items: CartItem[];
  cartDiscountAmount: string;
  cartDiscountPercent: string;
  authorizingManagerId: string | null;
  savedAt: number; // Date.now()
}

export interface QueuedSale {
  id?: number; // autoIncrement, assigned by IDB
  payload: CreateSalePayload;
  queuedAt: string; // ISO timestamp
  retryCount: number;
}

interface LankaCommerceDB extends DBSchema {
  cart_persist: {
    key: string;
    value: CartSnapshot;
  };
  sale_queue: {
    key: number;
    value: QueuedSale;
  };
}

// ──────────────────────────────────────────────────────────────────
// DB singleton
// ──────────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<LankaCommerceDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<LankaCommerceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LankaCommerceDB>("lankacommerce_offline_db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cart_persist")) {
          db.createObjectStore("cart_persist", { keyPath: "storeKey" });
        }
        if (!db.objectStoreNames.contains("sale_queue")) {
          db.createObjectStore("sale_queue", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      },
    });
  }
  return dbPromise;
}

// ──────────────────────────────────────────────────────────────────
// Cart persistence helpers
// ──────────────────────────────────────────────────────────────────

export async function saveCartSnapshot(
  storeKey: string,
  items: CartItem[],
  cartDiscountAmount: string,
  cartDiscountPercent: string,
  authorizingManagerId: string | null,
): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.put("cart_persist", {
      storeKey,
      items,
      cartDiscountAmount,
      cartDiscountPercent,
      authorizingManagerId,
      savedAt: Date.now(),
    });
  } catch (err) {
    console.warn("[idb-store] saveCartSnapshot failed:", err);
  }
}

export async function loadCartSnapshot(
  storeKey: string,
): Promise<CartSnapshot | null> {
  try {
    const db = await getOfflineDB();
    return (await db.get("cart_persist", storeKey)) ?? null;
  } catch (err) {
    console.warn("[idb-store] loadCartSnapshot failed:", err);
    return null;
  }
}

export async function clearCartSnapshot(storeKey: string): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.delete("cart_persist", storeKey);
  } catch (err) {
    console.warn("[idb-store] clearCartSnapshot failed:", err);
  }
}

// ──────────────────────────────────────────────────────────────────
// Sale queue helpers (for offline → sync)
// ──────────────────────────────────────────────────────────────────

export async function enqueueOfflineSale(
  payload: CreateSalePayload,
): Promise<number> {
  const db = await getOfflineDB();
  const record: QueuedSale = {
    payload,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  };
  return (await db.add("sale_queue", record)) as number;
}

/**
 * Returns the oldest queued sale, or null if the queue is empty.
 */
export async function getQueuedSale(): Promise<QueuedSale | null> {
  try {
    const db = await getOfflineDB();
    const cursor = await db
      .transaction("sale_queue", "readonly")
      .store.openCursor();
    if (!cursor) return null;
    return cursor.value;
  } catch (err) {
    console.warn("[idb-store] getQueuedSale failed:", err);
    return null;
  }
}

/**
 * Removes a queued sale by its IDB id.
 */
export async function dequeueOfflineSale(id: number): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.delete("sale_queue", id);
  } catch (err) {
    console.warn("[idb-store] dequeueOfflineSale failed:", err);
  }
}

/**
 * Increments the retryCount on a queued sale record.
 */
export async function incrementRetryCount(id: number): Promise<void> {
  try {
    const db = await getOfflineDB();
    const tx = db.transaction("sale_queue", "readwrite");
    const record = await tx.store.get(id);
    if (record) {
      record.retryCount += 1;
      await tx.store.put(record);
    }
    await tx.done;
  } catch (err) {
    console.warn("[idb-store] incrementRetryCount failed:", err);
  }
}
