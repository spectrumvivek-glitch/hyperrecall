/**
 * Image persistence utilities.
 *
 * On web, ImagePicker returns short-lived `blob:` URLs that are tied to the
 * current browser session.  As soon as the page reloads (or the blob is GC'd),
 * those URLs become invalid and images disappear.
 *
 * `makePersistentUri` converts a blob/object URL into a base64 `data:` URI
 * using an in-memory <canvas> (with optional downscaling) so the image can be
 * safely stored in AsyncStorage and survive reloads.
 *
 * On native the Expo cache path is already persistent, so we return it as-is.
 */

import { Platform } from "react-native";

/** Max dimension (width or height) used when resizing on web before encoding */
const MAX_DIM = 1024;
/** JPEG quality used when encoding */
const QUALITY = 0.75;

/**
 * Returns a URI that is safe to serialise into AsyncStorage.
 *
 * Web  : blob/http URIs → base64 `data:image/jpeg;base64,...`
 * Native: file:// / content:// URIs returned unchanged
 */
export async function makePersistentUri(uri: string): Promise<string> {
  // Already persistent formats — pass through
  if (
    Platform.OS !== "web" ||
    uri.startsWith("data:") ||
    uri.startsWith("https://firebasestorage.googleapis.com") ||
    uri.startsWith("https://storage.googleapis.com")
  ) {
    return uri;
  }

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
        resolve(uri); // fallback — better a blob than nothing
      }
    };

    img.onerror = () => resolve(uri);
    img.crossOrigin = "anonymous";
    img.src = uri;
  });
}

/**
 * Converts an array of picked URIs to persistent URIs in parallel.
 * Shows a best-effort approach: if a single image fails, the original URI is
 * kept so the session still works even if reload persistence is lost.
 */
export async function makePersistentUris(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map((uri) => makePersistentUri(uri)));
}
