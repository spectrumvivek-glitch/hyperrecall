/**
 * Cloud sync orchestrator.
 *
 * Strategy:
 * - On user login: pullFromCloud merges cloud → local. If cloud is empty, push local up.
 * - On every local mutation: fire-and-forget push to cloud.
 * - Images ARE synced — uploaded to Firebase Storage and referenced by https URL.
 * - Network errors are swallowed silently — local AsyncStorage is the source of truth
 *   for the running app, so the UI never breaks if sync fails.
 */

import {
  Note,
  NoteImage,
  getCategories,
  getNotes,
  getRevisionPlans,
  getUserStats,
  saveCategories,
  saveNotes,
  saveRevisionPlans,
  saveUserStats,
} from "./storage";
import {
  CloudImage,
  fetchAllNotes,
  fetchUserMeta,
  pushAllNotes,
  pushNote,
  pushUserMeta,
  removeNoteFromCloud,
} from "./firestore";
import {
  deleteAllNoteImages,
  isFirebaseUrl,
  uploadNoteImages,
} from "./storage-firebase";

let lastSyncedUserId: string | null = null;

export function hasSyncedThisSession(uid: string): boolean {
  return lastSyncedUserId === uid;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Uploads any non-Firebase images to Firebase Storage, returns the cloud
 * image array (id + permanent download URL) AND the updated local NoteImage[]
 * with URIs replaced by Firebase URLs (so future re-saves skip re-upload and
 * the local note survives a cache wipe).
 */
async function uploadImagesForNote(
  uid: string,
  noteId: string,
  images: NoteImage[]
): Promise<{ cloudImages: CloudImage[]; updatedLocal: NoteImage[] }> {
  if (images.length === 0) {
    return { cloudImages: [], updatedLocal: [] };
  }
  const results = await uploadNoteImages(
    uid,
    noteId,
    images.map((img) => ({ id: img.id, uri: img.uri }))
  );
  const urlMap = new Map(results.map((r) => [r.imageId, r.downloadUrl]));
  const updatedLocal = images.map((img) => {
    const url = urlMap.get(img.id);
    return url && url !== img.uri
      ? { ...img, uri: url, thumbnailUri: url }
      : img;
  });
  const cloudImages: CloudImage[] = updatedLocal.map((img) => ({
    id: img.id,
    url: img.uri,
  }));
  return { cloudImages, updatedLocal };
}

/**
 * After uploading images, write the new URLs back to local storage WITHOUT
 * bumping `updatedAt` (this is a behind-the-scenes URL swap, not an edit).
 */
async function persistNewImageUrlsLocally(
  noteId: string,
  newImages: NoteImage[]
): Promise<void> {
  const allNotes = await getNotes();
  const target = allNotes.find((n) => n.id === noteId);
  if (!target) return;
  const changed =
    target.images.length !== newImages.length ||
    target.images.some(
      (img, i) => img.uri !== newImages[i]?.uri
    );
  if (!changed) return;
  const updated = allNotes.map((n) =>
    n.id === noteId ? { ...n, images: newImages } : n
  );
  await saveNotes(updated);
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

/**
 * Pulls everything from the cloud and merges into local storage.
 * - If the cloud is empty, pushes the device's current local data up.
 * - Cloud image URLs (https://...) replace local URIs so they work cross-device.
 * Idempotent — safe to call multiple times.
 */
export async function syncFromCloud(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const [cloudMeta, cloudNotes] = await Promise.all([
      fetchUserMeta(uid),
      fetchAllNotes(uid),
    ]);

    const cloudHasData =
      (cloudMeta &&
        (cloudMeta.categories.length > 0 ||
          cloudMeta.plans.length > 0 ||
          cloudMeta.stats)) ||
      cloudNotes.length > 0;

    if (!cloudHasData) {
      await pushAllToCloud(uid);
      lastSyncedUserId = uid;
      return;
    }

    // Build merged notes — cloud is authoritative for everything including images.
    const mergedNotes: Note[] = cloudNotes.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      categoryId: c.categoryId,
      images: c.images.map((img) => ({
        id: img.id,
        noteId: c.id,
        uri: img.url,
        thumbnailUri: img.url,
      })),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    await saveNotes(mergedNotes);

    if (cloudMeta) {
      if (cloudMeta.categories.length > 0) {
        await saveCategories(cloudMeta.categories);
      }
      await saveRevisionPlans(cloudMeta.plans);
      if (cloudMeta.stats) {
        await saveUserStats(cloudMeta.stats);
      }
    }

    lastSyncedUserId = uid;
  } catch (err) {
    console.warn("[cloudSync] syncFromCloud failed:", err);
  }
}

// ─── Push (full backup) ───────────────────────────────────────────────────────

/**
 * Pushes ALL local data to the cloud — used for first-time backup.
 * Uploads any local images first.
 */
export async function pushAllToCloud(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const [notes, categories, plans, stats] = await Promise.all([
      getNotes(),
      getCategories(),
      getRevisionPlans(),
      getUserStats(),
    ]);

    // Upload images for every note in parallel (each note's images upload internally in parallel too).
    const imageUrlsByNoteId = new Map<string, CloudImage[]>();
    const noteUpdates: Array<{ id: string; images: NoteImage[] }> = [];
    await Promise.all(
      notes.map(async (n) => {
        try {
          const { cloudImages, updatedLocal } = await uploadImagesForNote(
            uid,
            n.id,
            n.images
          );
          imageUrlsByNoteId.set(n.id, cloudImages);
          if (updatedLocal.length > 0) {
            noteUpdates.push({ id: n.id, images: updatedLocal });
          }
        } catch (err) {
          console.warn(`[cloudSync] image upload failed for note ${n.id}:`, err);
          // Push the note without images on failure (text/title still sync)
          imageUrlsByNoteId.set(n.id, []);
        }
      })
    );

    // Persist updated image URLs back to local notes
    if (noteUpdates.length > 0) {
      const allNotes = await getNotes();
      const updateMap = new Map(noteUpdates.map((u) => [u.id, u.images]));
      const merged = allNotes.map((n) =>
        updateMap.has(n.id) ? { ...n, images: updateMap.get(n.id)! } : n
      );
      await saveNotes(merged);
    }

    await Promise.all([
      pushAllNotes(uid, notes, imageUrlsByNoteId),
      pushUserMeta(uid, { categories, plans, stats }),
    ]);
  } catch (err) {
    console.warn("[cloudSync] pushAllToCloud failed:", err);
  }
}

// ─── Push (single note) ───────────────────────────────────────────────────────

/**
 * Push a single note (after create or edit). Fire-and-forget.
 * Uploads new local images first, then pushes the note doc with cloud URLs.
 */
export function pushNoteAsync(uid: string | null, note: Note): void {
  if (!uid) return;
  (async () => {
    try {
      const { cloudImages, updatedLocal } = await uploadImagesForNote(
        uid,
        note.id,
        note.images
      );
      await persistNewImageUrlsLocally(note.id, updatedLocal);
      await pushNote(uid, note, cloudImages);
    } catch (err) {
      console.warn("[cloudSync] pushNoteAsync failed:", err);
      // Fall back to pushing the note without images so text still syncs
      try {
        await pushNote(
          uid,
          note,
          note.images
            .filter((img) => isFirebaseUrl(img.uri))
            .map((img) => ({ id: img.id, url: img.uri }))
        );
      } catch (innerErr) {
        console.warn("[cloudSync] fallback pushNote failed:", innerErr);
      }
    }
  })();
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a note from the cloud (Firestore doc + Storage images).
 * Pass the note's image IDs so images can be removed from Storage.
 */
export function deleteNoteAsync(
  uid: string | null,
  noteId: string,
  imageIds: string[] = []
): void {
  if (!uid) return;
  (async () => {
    try {
      await Promise.all([
        removeNoteFromCloud(uid, noteId),
        imageIds.length > 0
          ? deleteAllNoteImages(uid, noteId, imageIds)
          : Promise.resolve(),
      ]);
    } catch (err) {
      console.warn("[cloudSync] deleteNoteAsync failed:", err);
    }
  })();
}

// ─── Push (meta) ──────────────────────────────────────────────────────────────

/**
 * Push the combined meta doc (categories + plans + stats). Fire-and-forget.
 */
export function pushMetaAsync(uid: string | null): void {
  if (!uid) return;
  (async () => {
    try {
      const [categories, plans, stats] = await Promise.all([
        getCategories(),
        getRevisionPlans(),
        getUserStats(),
      ]);
      await pushUserMeta(uid, { categories, plans, stats });
    } catch (err) {
      console.warn("[cloudSync] pushMetaAsync failed:", err);
    }
  })();
}

export function clearSyncSession(): void {
  lastSyncedUserId = null;
}
