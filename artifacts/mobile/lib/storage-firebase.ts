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
 *  - Converts local URIs to Blobs via fetch() — works on both web and native.
 *  - Uses uploadBytesResumable for per-image progress callbacks.
 *  - Uploads multiple images in parallel for speed.
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

// ─── Single image upload ──────────────────────────────────────────────────────

/**
 * Uploads a single image to Firebase Storage.
 * Returns the permanent HTTPS download URL.
 *
 * @param userId    Firebase Auth UID
 * @param noteId    Note ID (used as a folder name)
 * @param imageId   Unique image ID (used as filename)
 * @param uri       Local file URI (file://) or blob URL from image picker
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

  // Convert local URI to Blob — works in both Expo web and native
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type || "image/jpeg",
    });

    task.on(
      "state_changed",
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        onProgress?.(Math.round(pct));
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
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
