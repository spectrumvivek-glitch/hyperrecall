/**
 * Firebase Storage upload utilities for note images.
 *
 * Storage path: users/{uid}/notes/{noteId}/{imageId}
 *
 * Security: each image is scoped under the owner's UID — Storage rules
 * enforce `request.auth.uid == userId` so no user can read or write
 * another user's files (see storage.rules).
 *
 * Upload strategy:
 *  - data: URIs (base64)  → decoded directly with atob() — no fetch() needed
 *  - blob: / file: URIs   → fetched as Blob via fetch()
 *  - Existing Firebase URLs → skipped (already uploaded)
 *  - Parallel uploads for speed
 */

import {
  StorageReference,
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { storage } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  imageId: string;
  downloadUrl: string;
}

export type ProgressCallback = (imageId: string, pct: number) => void;

// ─── Path helper ──────────────────────────────────────────────────────────────

function imageRef(userId: string, noteId: string, imageId: string): StorageReference {
  return ref(storage, `users/${userId}/notes/${noteId}/${imageId}`);
}

// Detect whether a URI is already a Firebase Storage download URL
export function isFirebaseUrl(uri: string): boolean {
  return (
    uri.startsWith("https://firebasestorage.googleapis.com") ||
    uri.startsWith("https://storage.googleapis.com")
  );
}

// ─── URI → Blob conversion ───────────────────────────────────────────────────

/**
 * Convert any image URI to a Blob.
 *
 * - `data:` URIs   — decoded via atob() without fetch() (avoids iframe CSP hangs)
 * - `blob:` / `file:` / `http:` URIs — fetched normally
 */
async function uriToBlob(uri: string): Promise<Blob> {
  if (uri.startsWith("data:")) {
    // Parse  "data:<mime>;base64,<data>"
    const commaIdx = uri.indexOf(",");
    if (commaIdx === -1) throw new Error("Invalid data URI");

    const header = uri.slice(0, commaIdx);           // "data:image/jpeg;base64"
    const base64 = uri.slice(commaIdx + 1);           // the actual base64 string
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  // blob:, file:, http:, https: URIs
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  return response.blob();
}

// ─── Single image upload ──────────────────────────────────────────────────────

/**
 * Uploads a single image to Firebase Storage.
 * Returns the permanent HTTPS download URL.
 *
 * @param userId      Firebase Auth UID
 * @param noteId      Note ID (used as folder name)
 * @param imageId     Unique image ID (used as filename)
 * @param uri         Local URI — data:, blob:, file:, or https:
 * @param onProgress  Optional callback with upload percentage 0–100
 */
export async function uploadNoteImage(
  userId: string,
  noteId: string,
  imageId: string,
  uri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const storageRef = imageRef(userId, noteId, imageId);

  // Convert to Blob — handles data: URIs without fetch() to avoid CSP hangs
  const blob = await uriToBlob(uri);

  return new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type || "image/jpeg",
    });

    task.on(
      "state_changed",
      (snap) => {
        if (snap.totalBytes > 0) {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          onProgress?.(Math.min(99, Math.round(pct)));
        }
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          onProgress?.(100);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// ─── Batch upload ─────────────────────────────────────────────────────────────

/**
 * Uploads multiple images in parallel.
 * Only uploads images that don't already have a Firebase download URL
 * (so re-saves don't re-upload existing cloud images).
 *
 * Returns an array of { imageId, downloadUrl } for every image
 * (existing Firebase URLs are passed through unchanged).
 */
export async function uploadNoteImages(
  userId: string,
  noteId: string,
  images: Array<{ id: string; uri: string }>,
  onProgress?: ProgressCallback
): Promise<UploadResult[]> {
  const results = await Promise.all(
    images.map(async (img): Promise<UploadResult> => {
      // Skip images already in Firebase Storage
      if (isFirebaseUrl(img.uri)) {
        return { imageId: img.id, downloadUrl: img.uri };
      }

      const downloadUrl = await uploadNoteImage(
        userId,
        noteId,
        img.id,
        img.uri,
        (pct) => onProgress?.(img.id, pct)
      );
      return { imageId: img.id, downloadUrl };
    })
  );
  return results;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes a single image from Firebase Storage.
 * Silently ignores 'object-not-found' errors so it's safe to call on cleanup.
 */
export async function deleteNoteImage(
  userId: string,
  noteId: string,
  imageId: string
): Promise<void> {
  try {
    await deleteObject(imageRef(userId, noteId, imageId));
  } catch (err: any) {
    if (err?.code !== "storage/object-not-found") throw err;
  }
}

/**
 * Deletes all images for a note from Firebase Storage.
 * Runs deletions in parallel for speed.
 */
export async function deleteAllNoteImages(
  userId: string,
  noteId: string,
  imageIds: string[]
): Promise<void> {
  await Promise.all(imageIds.map((id) => deleteNoteImage(userId, noteId, id)));
}
