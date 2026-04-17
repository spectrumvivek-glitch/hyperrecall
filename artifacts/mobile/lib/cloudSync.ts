/**
 * Cloud sync orchestrator.
 *
 * Strategy:
 * - On user login: pullFromCloud merges cloud → local. If cloud is empty, push local up.
 * - On every local mutation: fire-and-forget push to cloud.
 * - Images stay on the device (per project goal). Local images survive cloud overwrites.
 * - Network errors are swallowed silently — local AsyncStorage is the source of truth
 *   for the running app, so the UI never breaks if sync fails.
 */

import {
  Note,
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
  fetchAllNotes,
  fetchUserMeta,
  pushAllNotes,
  pushNote,
  pushUserMeta,
  removeNoteFromCloud,
} from "./firestore";

let lastSyncedUserId: string | null = null;

/**
 * Returns true if a cloud→local pull was performed for this user during this session.
 */
export function hasSyncedThisSession(uid: string): boolean {
  return lastSyncedUserId === uid;
}

/**
 * Pulls everything from the cloud and merges into local storage.
 * - If the cloud is empty, pushes the device's current local data up (first-time backup).
 * - Note images are preserved from local when cloud notes overwrite local notes.
 *
 * Idempotent — safe to call multiple times.
 */
export async function syncFromCloud(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const [cloudMeta, cloudNotes, localNotes, localCats, localPlans, localStats] =
      await Promise.all([
        fetchUserMeta(uid),
        fetchAllNotes(uid),
        getNotes(),
        getCategories(),
        getRevisionPlans(),
        getUserStats(),
      ]);

    const cloudHasData =
      (cloudMeta && (cloudMeta.categories.length > 0 || cloudMeta.plans.length > 0 || cloudMeta.stats)) ||
      cloudNotes.length > 0;

    if (!cloudHasData) {
      // First time on cloud — push local up as the initial backup.
      await pushAllToCloud(uid);
      lastSyncedUserId = uid;
      return;
    }

    // Cloud has data → merge into local.
    // Notes: cloud wins on text/title/categoryId; local images preserved by id.
    const localImagesByNoteId = new Map<string, Note["images"]>();
    for (const n of localNotes) {
      localImagesByNoteId.set(n.id, n.images ?? []);
    }
    const mergedNotes: Note[] = cloudNotes.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      categoryId: c.categoryId,
      images: localImagesByNoteId.get(c.id) ?? [],
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

/**
 * Pushes ALL local data to the cloud — used for first-time backup
 * and "force resync" scenarios.
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
    await Promise.all([
      pushAllNotes(uid, notes),
      pushUserMeta(uid, { categories, plans, stats }),
    ]);
  } catch (err) {
    console.warn("[cloudSync] pushAllToCloud failed:", err);
  }
}

/**
 * Push a single note (after create or edit). Fire-and-forget.
 */
export function pushNoteAsync(uid: string | null, note: Note): void {
  if (!uid) return;
  pushNote(uid, note).catch((err) => {
    console.warn("[cloudSync] pushNoteAsync failed:", err);
  });
}

/**
 * Delete a note from the cloud. Fire-and-forget.
 */
export function deleteNoteAsync(uid: string | null, noteId: string): void {
  if (!uid) return;
  removeNoteFromCloud(uid, noteId).catch((err) => {
    console.warn("[cloudSync] deleteNoteAsync failed:", err);
  });
}

/**
 * Push the combined meta doc (categories + plans + stats). Fire-and-forget.
 * Reads the latest local state, so call this after any local mutation
 * to those stores.
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

/**
 * Reset session sync tracking — call on sign-out.
 */
export function clearSyncSession(): void {
  lastSyncedUserId = null;
}
