import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

/**
 * Creates a user profile document in the `users` collection.
 * Safe to call on every login — uses setDoc with merge so it won't overwrite.
 *
 * Firestore path: users/{userId}
 */
export async function createUserProfile(
  userId: string,
  email: string
): Promise<void> {
  const ref = doc(db, "users", userId);
  await setDoc(
    ref,
    {
      email,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Saves a note to the `notes` collection for the given user.
 *
 * Firestore path: notes/{auto-id}
 * Returns the new document ID.
 */
export async function saveNote(
  userId: string,
  noteContent: string
): Promise<string> {
  const ref = await addDoc(collection(db, "notes"), {
    userId,
    content: noteContent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetches all notes belonging to the given user.
 *
 * Firestore path: notes (filtered by userId)
 */
export interface CloudNote {
  id: string;
  userId: string;
  content: string;
  createdAt: number | null;
}

export async function getUserNotes(userId: string): Promise<CloudNote[]> {
  const q = query(collection(db, "notes"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      content: data.content,
      createdAt: data.createdAt?.toMillis?.() ?? null,
    };
  });
}

/**
 * Schedules a review for the given note.
 *
 * Firestore path: reviews/{auto-id}
 * Returns the new review document ID.
 */
export async function scheduleReview(
  userId: string,
  noteId: string,
  nextReviewDate: Date
): Promise<string> {
  const ref = await addDoc(collection(db, "reviews"), {
    userId,
    noteId,
    nextReviewDate: nextReviewDate.toISOString(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
