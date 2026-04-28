/**
 * Web-only IndexedDB store for image blobs.
 *
 * Why: On web, AsyncStorage is backed by localStorage which has a small
 * (~5–10 MB) per-origin quota. Inlining base64 image data inside the
 * `sr_notes` JSON value blows past the quota after only a handful of photos.
 *
 * Strategy: Move the heavy bytes out of localStorage and into IndexedDB
 * (which has a much larger quota — typically hundreds of MB to GBs). In
 * `sr_notes` we keep only a tiny reference string of the form
 * `idb-blob:<id>`.
 *
 * On read (`getNotes()`), references are hydrated to short-lived `blob:`
 * object URLs that React Native Web can render. A reverse-cache maps each
 * minted object URL back to its IDB id so subsequent saves don't re-upload
 * the same bytes.
 *
 * No-ops on non-web platforms.
 */

import { Platform } from "react-native";

export const IDB_BLOB_PREFIX = "idb-blob:";

const DB_NAME = "hyperrecall_blobs";
const STORE_NAME = "blobs";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
const idToObjectUrl = new Map<string, string>();
const objectUrlToId = new Map<string, string>();

function isWebRuntime(): boolean {
  return Platform.OS === "web" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
    });
  }
  return dbPromise;
}

function genId(): string {
  return Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

export function isIdbBlobRef(uri: string | undefined | null): boolean {
  return !!uri && uri.startsWith(IDB_BLOB_PREFIX);
}

/** Returns the cached idb-blob ref a given object-URL was minted from, or undefined. */
export function findRefForObjectUrl(uri: string): string | undefined {
  const id = objectUrlToId.get(uri);
  return id ? IDB_BLOB_PREFIX + id : undefined;
}

async function uriToBlob(uri: string): Promise<Blob> {
  // fetch supports data:, blob:, http(s):, file: URIs uniformly on web.
  const res = await fetch(uri);
  if (!res.ok && res.status !== 0) {
    throw new Error(`fetch ${uri} → ${res.status}`);
  }
  return await res.blob();
}

/**
 * Persist the blob bytes pointed to by `uri` into IndexedDB and return a
 * stable `idb-blob:<id>` reference. If the URI is already a ref, returns it
 * unchanged. If it's an object URL minted from an earlier hydration, returns
 * the cached ref (no re-upload).
 *
 * No-op on non-web platforms (returns the input unchanged).
 */
export async function putUriInIdb(uri: string): Promise<string> {
  if (!isWebRuntime()) return uri;
  if (isIdbBlobRef(uri)) return uri;

  const cachedId = objectUrlToId.get(uri);
  if (cachedId) return IDB_BLOB_PREFIX + cachedId;

  const blob = await uriToBlob(uri);
  const id = genId();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb put failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb put aborted"));
  });
  return IDB_BLOB_PREFIX + id;
}

/**
 * Resolve an `idb-blob:<id>` reference to a renderable `blob:` object URL.
 * Object URLs are cached for the lifetime of the page so the same image is
 * not re-minted on every read.
 *
 * Returns the input unchanged on non-web platforms or for non-ref URIs.
 * Returns an empty string if the underlying blob is missing in IDB.
 */
export async function resolveIdbRefToObjectUrl(ref: string): Promise<string> {
  if (!isWebRuntime() || !isIdbBlobRef(ref)) return ref;
  const id = ref.slice(IDB_BLOB_PREFIX.length);

  const cached = idToObjectUrl.get(id);
  if (cached) return cached;

  const db = await openDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error ?? new Error("idb get failed"));
  });
  if (!blob) return "";

  const url = URL.createObjectURL(blob);
  idToObjectUrl.set(id, url);
  objectUrlToId.set(url, id);
  return url;
}

/**
 * Delete a blob from IndexedDB. Accepts either an `idb-blob:<id>` ref or
 * the object URL that was previously minted from one (using the reverse
 * cache).  No-op for unknown URIs.
 */
export async function deleteIdbRef(uri: string): Promise<void> {
  if (!isWebRuntime()) return;

  let id: string | undefined;
  if (isIdbBlobRef(uri)) {
    id = uri.slice(IDB_BLOB_PREFIX.length);
  } else if (objectUrlToId.has(uri)) {
    id = objectUrlToId.get(uri);
  }
  if (!id) return;

  const cachedUrl = idToObjectUrl.get(id);
  if (cachedUrl) {
    try {
      URL.revokeObjectURL(cachedUrl);
    } catch {
      /* ignore */
    }
    idToObjectUrl.delete(id);
    objectUrlToId.delete(cachedUrl);
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id!);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"));
  });
}
