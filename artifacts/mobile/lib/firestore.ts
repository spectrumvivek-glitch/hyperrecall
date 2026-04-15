/**
 * Firestore data layer — subcollection architecture
 *
 * Schema (designed to scale to 20M+ users):
 *   users/{uid}                    — user profile doc
 *   users/{uid}/notes/{noteId}     — user's notes (real-time capable)
 *   users/{uid}/reviews/{reviewId} — review schedules
 *   users/{uid}/stats              — aggregated stats doc
 *
 * Why subcollections over a flat collection with userId filters?
 *   1. Security rules trivially: `request.auth.uid == userId` — no rules leak
 *   2. No composite indexes on userId + other fields
 *   3. Firestore bills per document read; scoped queries eliminate cross-user scans
 *   4. Scales linearly — each user's data is isolated, no hot-spots
 *   5. Pagination cursors stay within a single user's data
 */

import {
  FirestoreError,
  QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CloudNote {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  /** Firebase Storage download URLs for attached images */
  imageUrls: string[];
  createdAt: number | null;
  updatedAt: number | null;
  syncedAt: number | null;
}

export interface CloudStats {
  totalXp: number;
  totalCompleted: number;
  currentStreak: number;
  lastActiveDate: number;
  updatedAt: number | null;
}

export type NoteListener = (notes: CloudNote[]) => void;
export type NoteErrorListener = (err: FirestoreError) => void;

// ─── Path helpers — single source of truth for Firestore paths ────────────────

const userDoc = (uid: string) => doc(db, "users", uid);
const notesCol = (uid: string) => collection(db, "users", uid, "notes");
const noteDoc = (uid: string, noteId: string) =>
  doc(db, "users", uid, "notes", noteId);
const reviewsCol = (uid: string) => collection(db, "users", uid, "reviews");
const reviewDoc = (uid: string, reviewId: string) =>
  doc(db, "users", uid, "reviews", reviewId);
const statsDoc = (uid: string) => doc(db, "users", uid, "stats");

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapNote(d: QueryDocumentSnapshot): CloudNote {
  const data = d.data();
  return {
    id: d.id,
    title: data.title ?? "",
    content: data.content ?? "",
    categoryId: data.categoryId ?? "",
    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : null,
    syncedAt: Date.now(),
  };
}

// ─── User Profile ─────────────────────────────────────────────────────────────

/**
 * Upserts the user profile. Safe to call on every login (merge: true).
 */
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

// ─── Real-time Notes Subscription ────────────────────────────────────────────

/**
 * Opens a Firestore real-time listener for the user's notes.
 * Returns an unsubscribe function — always call it on component unmount.
 *
 * Cost optimisation: limited to 200 most-recently updated notes.
 * Use getNotesPage() for users with larger collections.
 */
export function subscribeToNotes(
  userId: string,
  onData: NoteListener,
  onError: NoteErrorListener
): () => void {
  const q = query(notesCol(userId), orderBy("updatedAt", "desc"), limit(200));
  return onSnapshot(q, (snap) => onData(snap.docs.map(mapNote)), onError);
}

// ─── Note CRUD ────────────────────────────────────────────────────────────────

export async function addCloudNote(
  userId: string,
  note: Pick<CloudNote, "title" | "content" | "categoryId" | "imageUrls">
): Promise<string> {
  const ref = await addDoc(notesCol(userId), {
    ...note,
    imageUrls: note.imageUrls ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCloudNote(
  userId: string,
  noteId: string,
  updates: Partial<Pick<CloudNote, "title" | "content" | "categoryId" | "imageUrls">>
): Promise<void> {
  await updateDoc(noteDoc(userId, noteId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCloudNote(
  userId: string,
  noteId: string
): Promise<void> {
  await deleteDoc(noteDoc(userId, noteId));
}

// ─── Pagination (cursor-based, cost-efficient) ────────────────────────────────

export interface NotesPage {
  notes: CloudNote[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot | null;
}

/**
 * Fetches a page of notes using cursor-based pagination.
 * Pass the `lastDoc` from the previous page as `cursor` to get the next page.
 */
export async function getNotesPage(
  userId: string,
  pageSize = 50,
  cursor?: QueryDocumentSnapshot
): Promise<NotesPage> {
  const constraints: Parameters<typeof query>[1][] = [
    orderBy("updatedAt", "desc"),
    limit(pageSize + 1),
  ];
  if (cursor) constraints.push(startAfter(cursor));

  const snap = await getDocs(query(notesCol(userId), ...constraints));
  const hasMore = snap.docs.length > pageSize;
  const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

  return {
    notes: docs.map(mapNote),
    hasMore,
    lastDoc: docs[docs.length - 1] ?? null,
  };
}

// ─── Batch Sync (up to 20M notes) ────────────────────────────────────────────

const BATCH_LIMIT = 490; // Firestore hard limit is 500 ops per batch

/**
 * Bulk upserts notes for a user in Firestore-safe batches.
 * Use for initial data migration or periodic offline → cloud sync.
 */
export async function batchSyncNotes(
  userId: string,
  notes: Array<{ id: string } & Pick<CloudNote, "title" | "content" | "categoryId">>
): Promise<void> {
  for (let i = 0; i < notes.length; i += BATCH_LIMIT) {
    const chunk = notes.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const note of chunk) {
      batch.set(
        noteDoc(userId, note.id),
        {
          title: note.title,
          content: note.content,
          categoryId: note.categoryId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function scheduleReview(
  userId: string,
  noteId: string,
  nextReviewDate: Date
): Promise<string> {
  const ref = await addDoc(reviewsCol(userId), {
    noteId,
    nextReviewDate: nextReviewDate.toISOString(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteReview(
  userId: string,
  reviewId: string
): Promise<void> {
  await deleteDoc(reviewDoc(userId, reviewId));
}

// ─── Stats Sync ───────────────────────────────────────────────────────────────

/**
 * Persists aggregated user stats to the cloud.
 * Called after completing a revision or updating the streak.
 */
export async function syncStats(
  userId: string,
  stats: Omit<CloudStats, "updatedAt">
): Promise<void> {
  await setDoc(
    statsDoc(userId),
    { ...stats, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getCloudStats(
  userId: string
): Promise<CloudStats | null> {
  const snap = await getDoc(statsDoc(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    totalXp: d.totalXp ?? 0,
    totalCompleted: d.totalCompleted ?? 0,
    currentStreak: d.currentStreak ?? 0,
    lastActiveDate: d.lastActiveDate ?? 0,
    updatedAt:
      d.updatedAt instanceof Timestamp ? d.updatedAt.toMillis() : null,
  };
}

// ─── Account Deletion ─────────────────────────────────────────────────────────

/**
 * Deletes a user's profile doc.
 * Note: subcollection docs (notes, reviews) must be deleted client-side
 * before calling this, or handled by a Cloud Functions onDelete trigger
 * in production (recommended at scale).
 */
export async function deleteUserProfile(userId: string): Promise<void> {
  await deleteDoc(userDoc(userId));
}
