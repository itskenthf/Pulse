import { openDB } from "idb";
import type { SnapshotResponse } from "@/app/api/widgets/snapshot/route";

const DB_NAME = "pulse-offline-cache";
const DB_VERSION = 1;
const STORE_NAME = "widget-snapshots";

export interface StoredWidgetSnapshot {
  widgetId: string;
  data: unknown;
  /** When the data itself was last refreshed server-side. */
  updatedAt: string;
  /** When this browser wrote the record. */
  cachedAt: string;
}

function openCache() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: "widgetId" });
    },
  });
}

/**
 * Every exported function below wraps its body in try/catch and resolves
 * to a safe fallback rather than throwing. IndexedDB can be unavailable
 * (Safari private browsing, disabled storage) even when the `indexedDB`
 * global exists — `openDB` itself can reject — so this is a passive
 * enhancement that must never surface an error to the caller.
 */
export async function writeWidgetSnapshots(snapshots: SnapshotResponse): Promise<void> {
  let db;
  try {
    db = await openCache();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const cachedAt = new Date().toISOString();
    await Promise.all(
      Object.entries(snapshots).map(([widgetId, entry]) => {
        if (!entry) return undefined;
        const record: StoredWidgetSnapshot = {
          widgetId,
          data: entry.data,
          updatedAt: entry.updatedAt,
          cachedAt,
        };
        return tx.store.put(record);
      }),
    );
    await tx.done;
  } catch (err) {
    console.warn("Failed to write offline widget snapshots:", err);
  } finally {
    db?.close();
  }
}

export async function readWidgetSnapshot(widgetId: string): Promise<StoredWidgetSnapshot | null> {
  let db;
  try {
    db = await openCache();
    return (await db.get(STORE_NAME, widgetId)) ?? null;
  } catch (err) {
    console.warn("Failed to read offline widget snapshot:", err);
    return null;
  } finally {
    db?.close();
  }
}

export async function readAllWidgetSnapshots(): Promise<StoredWidgetSnapshot[]> {
  let db;
  try {
    db = await openCache();
    return await db.getAll(STORE_NAME);
  } catch (err) {
    console.warn("Failed to read offline widget snapshots:", err);
    return [];
  } finally {
    db?.close();
  }
}
