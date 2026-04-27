/**
 * Image persistence utilities — local-only storage, no cloud upload.
 *
 * Web:    ImagePicker returns short-lived `blob:` URLs. We convert them to
 *         base64 `data:` URIs via <canvas> so they survive page reloads when
 *         stored in AsyncStorage.
 *
 * Native: ImagePicker returns `file://` URIs pointing to the OS cache, which
 *         can be cleared at any time. We copy images to the app's permanent
 *         documentDirectory so they persist across sessions.
 */

import { Platform } from "react-native";

import { deleteIdbRef, isIdbBlobRef } from "./webBlobStore";

/** Max dimension (width or height) used when resizing on web before encoding */
const MAX_DIM = 1024;
/** JPEG quality used when encoding on web */
const QUALITY = 0.75;

// ─── Web: blob: → data: URI ───────────────────────────────────────────────────

/**
 * (Web only) Converts a blob/object URL to a base64 data: URI using <canvas>.
 * Downscales to MAX_DIM to keep AsyncStorage size reasonable.
 */
function blobUriToDataUri(uri: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new (window as any).Image() as HTMLImageElement;

    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight, 1));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(uri); return; }

        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      } catch {
        resolve(uri);
      }
    };

    img.onerror = () => resolve(uri);
    img.crossOrigin = "anonymous";
    img.src = uri;
  });
}

// ─── Native: cache → documentDirectory ───────────────────────────────────────

/**
 * (Native only) Copies an image from the OS temp/cache directory to the app's
 * permanent documentDirectory so it survives cache clears.
 * Returns the new persistent file:// URI.
 */
async function copyToDocumentsDir(uri: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require("expo-file-system");
    const dir: string | null = FileSystem.documentDirectory;
    if (!dir) return uri;

    const ext = (uri.split("/").pop()?.split(".").pop() ?? "jpg").toLowerCase();
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dest = `${dir}recallify_images/${filename}`;

    await FileSystem.makeDirectoryAsync(`${dir}recallify_images`, { intermediates: true });

    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists) {
      await FileSystem.copyAsync({ from: uri, to: dest });
    }
    return dest;
  } catch {
    return uri;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a URI that is safe to persist in AsyncStorage indefinitely.
 *
 * Web:    blob:/http: URIs  → base64 data: URI (stored inline in AsyncStorage)
 * Native: file:// cache URI → copied to documentDirectory
 * Other:  returned unchanged (already persistent data:, https: URIs)
 */
export async function makePersistentUri(uri: string): Promise<string> {
  if (uri.startsWith("data:") || uri.startsWith("https://")) {
    return uri;
  }

  if (Platform.OS === "web") {
    return blobUriToDataUri(uri);
  }

  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    return copyToDocumentsDir(uri);
  }

  return uri;
}

/**
 * Converts an array of URIs to persistent URIs in parallel.
 * If a single conversion fails, the original URI is kept as a fallback.
 */
export async function makePersistentUris(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map((uri) =>
    makePersistentUri(uri).catch(() => uri)
  ));
}

/**
 * Deletes a locally stored image file (native only).
 * Silently ignores errors — safe to call even if the file has already been removed.
 */
export async function deleteLocalImage(uri: string): Promise<void> {
  if (Platform.OS === "web") {
    // On web the bytes live in IndexedDB. Accept either an idb-blob ref or
    // an object URL that was minted from one.
    if (isIdbBlobRef(uri) || uri.startsWith("blob:")) {
      try {
        await deleteIdbRef(uri);
      } catch {
        // ignore
      }
    }
    return;
  }
  if (!uri.startsWith("file://")) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require("expo-file-system");
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
