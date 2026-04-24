import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import {
  clearSyncSession,
  deleteNoteAsync,
  pushMetaAsync,
  pushNoteAsync,
  syncFromCloud,
} from "@/lib/cloudSync";
import { initNotificationsOnFirstLaunch } from "@/lib/notifications";
import {
  Category,
  Note,
  NoteAttachment,
  NoteImage,
  RevisionPlan,
  UserStats,
  awardShareXp,
  completeRevision,
  createCategory,
  createNote,
  createRevisionPlan,
  deleteCategory,
  renameCategory,
  deleteNote,
  getDueNotes,
  getCategories,
  getNotes,
  getRevisionPlans,
  getUserStats,
  saveUserStats,
  seedDefaultsIfNeeded,
  skipRevision,
  updateNote,
  updateRevisionPlanSchedule,
} from "@/lib/storage";
import { calcImprovementPct, getXpProgress } from "@/lib/xp";

export interface XpInfo {
  totalXp: number;
  level: number;
  levelName: string;
  xpIntoLevel: number;
  xpNeeded: number;
  progressPct: number;
}

export interface LevelUpEvent {
  newLevel: number;
  levelName: string;
  xpGained: number;
}

interface AppContextValue {
  categories: Category[];
  notes: Note[];
  revisionPlans: RevisionPlan[];
  userStats: UserStats;
  dueNotes: { note: Note; plan: RevisionPlan }[];
  isLoading: boolean;
  xpInfo: XpInfo;
  improvementPct: number | null;
  pendingLevelUp: LevelUpEvent | null;
  pendingXp: number;
  streakMilestone: number | null;
  newBadges: string[];
  dismissLevelUp: () => void;
  dismissStreakMilestone: () => void;
  dismissNewBadges: () => void;

  addCategory: (name: string, color: string) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;

  addNote: (
    title: string,
    categoryId: string,
    content: string,
    images: NoteImage[],
    intervals: number[],
    attachments?: NoteAttachment[]
  ) => Promise<Note>;
  editNote: (id: string, updates: Partial<Note>, intervals?: number[]) => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  markCompleted: (noteId: string) => Promise<number>;
  markSkipped: (noteId: string) => Promise<void>;
  shareAndEarnXp: () => Promise<void>;

  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function buildXpInfo(stats: UserStats): XpInfo {
  const info = getXpProgress(stats.totalXp);
  return { totalXp: stats.totalXp, ...info };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [revisionPlans, setRevisionPlans] = useState<RevisionPlan[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    currentStreak: 0,
    lastActiveDate: 0,
    totalCompleted: 0,
    totalSkipped: 0,
    totalXp: 0,
    todayCompleted: 0,
    yesterdayCompleted: 0,
    lastXpDate: 0,
    earnedBadges: [],
    dailyGoal: 5,
  });
  const [dueNotes, setDueNotes] = useState<{ note: Note; plan: RevisionPlan }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLevelUp, setPendingLevelUp] = useState<LevelUpEvent | null>(null);
  const [pendingXp, setPendingXp] = useState(0);
  const [streakMilestone, setStreakMilestone] = useState<number | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  const xpInfo = buildXpInfo(userStats);
  const improvementPct = calcImprovementPct(userStats.todayCompleted, userStats.yesterdayCompleted);

  const refresh = useCallback(async () => {
    const [cats, nts, plans, stats, due] = await Promise.all([
      getCategories(),
      getNotes(),
      getRevisionPlans(),
      getUserStats(),
      getDueNotes(),
    ]);
    setCategories(cats);
    setNotes(nts);
    setRevisionPlans(plans);
    setUserStats(stats);
    setDueNotes(due);
  }, []);

  useEffect(() => {
    const init = async () => {
      await seedDefaultsIfNeeded();
      await refresh();
      setIsLoading(false);
      // Reuse already-fetched dueNotes — do not re-fetch; init notifications async
      initNotificationsOnFirstLaunch(0).catch(() => {});
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Cloud sync on auth change ──────────────────────────────────────────────
  // When the user logs in (or switches accounts), pull their data from the cloud
  // and refresh local state. On logout, clear session tracking so the next login
  // re-syncs.
  useEffect(() => {
    if (!uid) {
      clearSyncSession();
      return;
    }
    (async () => {
      await syncFromCloud(uid);
      await refresh();
    })();
  }, [uid, refresh]);

  const addCategory = useCallback(async (name: string, color: string) => {
    const cat = await createCategory(name, color);
    await refresh();
    pushMetaAsync(uid);
    return cat;
  }, [refresh, uid]);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    await refresh();
    pushMetaAsync(uid);
  }, [refresh, uid]);

  const renameCategoryFn = useCallback(async (id: string, name: string) => {
    await renameCategory(id, name);
    await refresh();
    pushMetaAsync(uid);
  }, [refresh, uid]);

  const addNote = useCallback(async (
    title: string,
    categoryId: string,
    content: string,
    images: NoteImage[],
    intervals: number[],
    attachments: NoteAttachment[] = []
  ) => {
    const note = await createNote(title, categoryId, content, images, attachments);
    await createRevisionPlan(note.id, intervals);
    await refresh();
    pushNoteAsync(uid, note);
    pushMetaAsync(uid); // plans changed
    return note;
  }, [refresh, uid]);

  const editNote = useCallback(async (id: string, updates: Partial<Note>, intervals?: number[]) => {
    await updateNote(id, updates);
    if (intervals && intervals.length > 0) {
      await updateRevisionPlanSchedule(id, intervals);
    }
    await refresh();
    const updated = (await getNotes()).find((n) => n.id === id);
    if (updated) pushNoteAsync(uid, updated);
    if (intervals && intervals.length > 0) pushMetaAsync(uid);
  }, [refresh, uid]);

  const removeNote = useCallback(async (id: string) => {
    // Capture image IDs BEFORE deleting so we can clean them up from Storage
    const allNotes = await getNotes();
    const target = allNotes.find((n) => n.id === id);
    const imageIds = target?.images.map((img) => img.id) ?? [];
    await deleteNote(id);
    await refresh();
    deleteNoteAsync(uid, id, imageIds);
    pushMetaAsync(uid); // plans changed (associated plan removed)
  }, [refresh, uid]);

  const markCompleted = useCallback(async (noteId: string): Promise<number> => {
    const result = await completeRevision(noteId);
    await refresh();
    pushMetaAsync(uid); // plans + stats changed
    setPendingXp(result.xpGained);
    if (result.newBadges && result.newBadges.length > 0) {
      setNewBadges(result.newBadges);
    }
    if (result.streakMilestone) {
      setStreakMilestone(result.streakMilestone);
    }
    if (result.leveledUp) {
      const stats = await getUserStats();
      const info = getXpProgress(stats.totalXp);
      setPendingLevelUp({
        newLevel: result.newLevel,
        levelName: info.levelName,
        xpGained: result.xpGained,
      });
    }
    return result.xpGained;
  }, [refresh, uid]);

  const markSkipped = useCallback(async (noteId: string) => {
    await skipRevision(noteId);
    const stats = await getUserStats();
    stats.totalSkipped += 1;
    await saveUserStats(stats);
    await refresh();
    pushMetaAsync(uid);
  }, [refresh, uid]);

  const shareAndEarnXp = useCallback(async () => {
    const result = await awardShareXp();
    setPendingXp(result.xpGained);
    await refresh();
    pushMetaAsync(uid);
    if (result.leveledUp) {
      const stats = await getUserStats();
      const info = getXpProgress(stats.totalXp);
      setPendingLevelUp({ newLevel: result.newLevel, levelName: info.levelName, xpGained: result.xpGained });
    }
  }, [refresh, uid]);

  const dismissLevelUp = useCallback(() => setPendingLevelUp(null), []);
  const dismissStreakMilestone = useCallback(() => setStreakMilestone(null), []);
  const dismissNewBadges = useCallback(() => setNewBadges([]), []);

  return (
    <AppContext.Provider
      value={{
        categories,
        notes,
        revisionPlans,
        userStats,
        dueNotes,
        isLoading,
        xpInfo,
        improvementPct,
        pendingLevelUp,
        pendingXp,
        streakMilestone,
        newBadges,
        dismissLevelUp,
        dismissStreakMilestone,
        dismissNewBadges,
        addCategory,
        removeCategory,
        renameCategory: renameCategoryFn,
        addNote,
        editNote,
        removeNote,
        markCompleted,
        markSkipped,
        shareAndEarnXp,
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
