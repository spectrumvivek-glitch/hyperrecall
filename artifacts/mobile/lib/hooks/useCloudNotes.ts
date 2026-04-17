import { useEffect, useState } from "react";

import { CloudNote, fetchAllNotes } from "@/lib/firestore";

/**
 * Fetches the current count of notes stored in the cloud for this user.
 * Used by the Settings screen to display sync status.
 *
 * Re-fetches when the user changes. Not real-time — call refresh() to update.
 */
export function useCloudNotes(userId: string | null) {
  const [notes, setNotes] = useState<CloudNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (uid: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllNotes(uid);
      setNotes(data);
    } catch (err: any) {
      setError(err?.message ?? "Sync error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setError(null);
      return;
    }
    load(userId);
  }, [userId]);

  return {
    notes,
    isLoading,
    error,
    refresh: () => (userId ? load(userId) : Promise.resolve()),
  };
}
