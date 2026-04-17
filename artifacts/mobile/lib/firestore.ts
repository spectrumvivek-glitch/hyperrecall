/**
 * Firestore data layer — Recallify cloud sync
 *
 * Schema:
 *   users/{uid}                       — user profile doc
 *   users/{uid}/data/main             — categories + plans + stats (small, atomic)
 *   users/{uid}/notes/{noteId}        — individual notes (scales)
 *
 * Notes:
 * - Images are NOT synced (per project goal — stored locally only).
 * - Notes are synced per-document so users with thousands of notes scale fine.
 * - Categories/plans/stats are small JSON arrays merged into a single doc.
 */

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "./firebase";
import type { Category, Note, RevisionPlan, UserStats } from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CloudImage {
  id: string;
  url: string;
}

export interface CloudNote {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  images: CloudImage[];
  createdAt: number;
  updatedAt: number;
}

export interface CloudUserData {
  categories: Category[];
  plans: RevisionPlan[];
  stats: UserStats | null;
  updatedAt: number;
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

const userDoc = (uid: string) => doc(db, "users", uid);
const userMetaDoc = (uid: string) => doc(db, "users", uid, "data", "main");
const notesCol = (uid: string) => collection(db, "users", uid, "notes");
const noteDoc = (uid: string, noteId: string) =>
  doc(db, "users", uid, "notes", noteId);

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function upsertUserProfile(
  userId: string,
  email: string,
  displayName?: string | null
): Promise<void> {
  await setDoc(
    userDoc(userId),
    {
      email,
      displayName: displayName ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteUserProfile(userId: string): Promise<void> {
  await deleteDoc(userDoc(userId));
}

// ─── Notes ────────────────────────────────────────────────────────────────────

/**
 * Push a single note to the cloud, including image download URLs.
 * Image URLs must already be uploaded — this function does NOT upload images itself
 * (call uploadNoteImages first via cloudSync.pushNoteAsync).
 */
export async function pushNote(
  userId: string,
  note: Note,
  imageUrls: CloudImage[]
): Promise<void> {
  await setDoc(
    noteDoc(userId, note.id),
    {
      title: note.title,
      content: note.content,
      categoryId: note.categoryId,
      images: imageUrls,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
    { merge: true }
  );
}

/**
 * Push many notes at once using batched writes (max ~490 per batch).
 * The imageUrlsByNoteId map provides the cloud image URLs for each note.
 */
const BATCH_LIMIT = 490;
export async function pushAllNotes(
  userId: string,
  notes: Note[],
  imageUrlsByNoteId: Map<string, CloudImage[]>
): Promise<void> {
  for (let i = 0; i < notes.length; i += BATCH_LIMIT) {
    const chunk = notes.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const n of chunk) {
      batch.set(
        noteDoc(userId, n.id),
        {
          title: n.title,
          content: n.content,
          categoryId: n.categoryId,
          images: imageUrlsByNoteId.get(n.id) ?? [],
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
}

export async function removeNoteFromCloud(
  userId: string,
  noteId: string
): Promise<void> {
  await deleteDoc(noteDoc(userId, noteId));
}

export async function fetchAllNotes(userId: string): Promise<CloudNote[]> {
  const snap = await getDocs(notesCol(userId));
  return snap.docs.map((d) => {
    const data = d.data();
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const images: CloudImage[] = rawImages
      .filter((i: any) => i && typeof i.url === "string" && typeof i.id === "string")
      .map((i: any) => ({ id: i.id, url: i.url }));
    return {
      id: d.id,
      title: data.title ?? "",
      content: data.content ?? "",
      categoryId: data.categoryId ?? "",
      images,
      createdAt:
        typeof data.createdAt === "number"
          ? data.createdAt
          : data.createdAt instanceof Timestamp
            ? data.createdAt.toMillis()
            : Date.now(),
      updatedAt:
        typeof data.updatedAt === "number"
          ? data.updatedAt
          : data.updatedAt instanceof Timestamp
            ? data.updatedAt.toMillis()
            : Date.now(),
    };
  });
}

// ─── Combined metadata (categories + plans + stats) ──────────────────────────

export async function pushUserMeta(
  userId: string,
  data: { categories: Category[]; plans: RevisionPlan[]; stats: UserStats }
): Promise<void> {
  await setDoc(
    userMetaDoc(userId),
    {
      categories: data.categories,
      plans: data.plans,
      stats: data.stats,
      updatedAt: Date.now(),
    },
    { merge: false } // overwrite — we always push the full latest state
  );
}

export async function fetchUserMeta(userId: string): Promise<CloudUserData | null> {
  const snap = await getDoc(userMetaDoc(userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    plans: Array.isArray(data.plans) ? data.plans : [],
    stats: data.stats ?? null,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  };
}
