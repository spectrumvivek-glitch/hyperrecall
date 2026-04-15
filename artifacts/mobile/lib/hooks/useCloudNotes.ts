import { FirestoreError } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

import { CloudNote, subscribeToNotes } from "@/lib/firestore";

export interface CloudNotesState {
  notes: CloudNote[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Subscribes to the signed-in user's notes in real time via Firestore onSnapshot.
 * Automatically unsubscribes when userId changes or the component unmounts.
 *
 * Returns:
 *   notes      — live-updated array of cloud notes
 *   isLoading  — true until the first snapshot arrives
 *   error      — last Firestore error message, or null
 */
export function useCloudNotes(userId: string | null): CloudNotesState {
  const [notes, setNotes] = useState<CloudNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Tear down any existing listener first
    unsubRef.current?.();
    unsubRef.current = null;

    if (!userId) {
      setNotes([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsub = subscribeToNotes(
      userId,
      (fresh) => {
        setNotes(fresh);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[useCloudNotes] Firestore error:", err.code, err.message);
        setError(friendlyError(err));
        setIsLoading(false);
      }
    );

    unsubRef.current = unsub;
    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [userId]);

  return { notes, isLoading, error };
}

// ─── Error mapping ────────────────────────────────────────────────────────────

function friendlyError(err: FirestoreError): string {
  switch (err.code) {
    case "permission-denied":
      return "You don't have permission to access this data.";
    case "unavailable":
      return "Offline — showing cached data.";
    case "unauthenticated":
      return "Please sign in to sync your notes.";
    case "resource-exhausted":
      return "Too many requests. Syncing will resume shortly.";
    default:
      return "Sync error. Your data is safe locally.";
  }
}
