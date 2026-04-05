import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  Category,
  Note,
  NoteImage,
  RevisionLog,
  RevisionPlan,
  UserStats,
  completeRevision,
  createCategory,
  createNote,
  createRevisionPlan,
  deleteCategory,
  deleteNote,
  getCategories,
  getDueNotes,
  getNotes,
  getRevisionLogs,
  getRevisionPlans,
  getUserStats,
  saveUserStats,
  seedDefaultsIfNeeded,
  skipRevision,
  updateNote,
} from "@/lib/storage";

interface AppContextValue {
  categories: Category[];
  notes: Note[];
  revisionPlans: RevisionPlan[];
  revisionLogs: RevisionLog[];
  userStats: UserStats;
  dueNotes: { note: Note; plan: RevisionPlan }[];
  isLoading: boolean;

  addCategory: (name: string, color: string) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;

  addNote: (
    title: string,
    categoryId: string,
    content: string,
    images: NoteImage[],
    intervals: number[]
  ) => Promise<Note>;
  editNote: (id: string, updates: Partial<Note>, intervals?: number[]) => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  markCompleted: (noteId: string) => Promise<void>;
  markSkipped: (noteId: string) => Promise<void>;

  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [revisionPlans, setRevisionPlans] = useState<RevisionPlan[]>([]);
  const [revisionLogs, setRevisionLogs] = useState<RevisionLog[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    currentStreak: 0,
    lastActiveDate: 0,
    totalCompleted: 0,
    totalSkipped: 0,
  });
  const [dueNotes, setDueNotes] = useState<{ note: Note; plan: RevisionPlan }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [cats, nts, plans, logs, stats, due] = await Promise.all([
      getCategories(),
      getNotes(),
      getRevisionPlans(),
      getRevisionLogs(),
      getUserStats(),
      getDueNotes(),
    ]);
    setCategories(cats);
    setNotes(nts);
    setRevisionPlans(plans);
    setRevisionLogs(logs);
    setUserStats(stats);
    setDueNotes(due);
  }, []);

  useEffect(() => {
    const init = async () => {
      await seedDefaultsIfNeeded();
      await refresh();
      setIsLoading(false);
    };
    init();
  }, [refresh]);

  const addCategory = useCallback(async (name: string, color: string) => {
    const cat = await createCategory(name, color);
    await refresh();
    return cat;
  }, [refresh]);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    await refresh();
  }, [refresh]);

  const addNote = useCallback(async (
    title: string,
    categoryId: string,
    content: string,
    images: NoteImage[],
    intervals: number[]
  ) => {
    const note = await createNote(title, categoryId, content, images);
    await createRevisionPlan(note.id, intervals);
    await refresh();
    return note;
  }, [refresh]);

  const editNote = useCallback(async (id: string, updates: Partial<Note>, intervals?: number[]) => {
    await updateNote(id, updates);
    if (intervals && intervals.length > 0) {
      await createRevisionPlan(id, intervals);
    }
    await refresh();
  }, [refresh]);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    await refresh();
  }, [refresh]);

  const markCompleted = useCallback(async (noteId: string) => {
    await completeRevision(noteId);
    await refresh();
  }, [refresh]);

  const markSkipped = useCallback(async (noteId: string) => {
    await skipRevision(noteId);
    const stats = await getUserStats();
    stats.totalSkipped += 1;
    await saveUserStats(stats);
    await refresh();
  }, [refresh]);

  return (
    <AppContext.Provider
      value={{
        categories,
        notes,
        revisionPlans,
        revisionLogs,
        userStats,
        dueNotes,
        isLoading,
        addCategory,
        removeCategory,
        addNote,
        editNote,
        removeNote,
        markCompleted,
        markSkipped,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
