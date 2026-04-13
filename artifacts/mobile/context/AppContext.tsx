import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { initNotificationsOnFirstLaunch } from "@/lib/notifications";
import {
  Category,
  Note,
  NoteImage,
  RevisionLog,
  RevisionPlan,
  UserStats,
  VacationSettings,
  awardShareXp,
  completeRevision,
  createCategory,
  createNote,
  createRevisionPlan,
  deleteCategory,
  deleteNote,
  getDueNotes,
  getCategories,
  getNotes,
  getRevisionLogs,
  getRevisionPlans,
  getUserStats,
  getVacationSettings,
  saveUserStats,
  seedDefaultsIfNeeded,
  skipRevision,
  updateNote,
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
  revisionLogs: RevisionLog[];
  userStats: UserStats;
  vacationSettings: VacationSettings;
  dueNotes: { note: Note; plan: RevisionPlan }[];
  isLoading: boolean;
  xpInfo: XpInfo;
  improvementPct: number | null;
  pendingLevelUp: LevelUpEvent | null;
  pendingXp: number;
  streakMilestone: number | null;
  dismissLevelUp: () => void;
  dismissStreakMilestone: () => void;

  addCategory: (name: string, color: string) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;

  addNote: (
    title: string,
    categoryId: string,
    content: string,
    images: NoteImage[],
    intervals: number[],
    mode?: "custom" | "sm2"
  ) => Promise<Note>;
  editNote: (id: string, updates: Partial<Note>, intervals?: number[], mode?: "custom" | "sm2") => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  markCompleted: (noteId: string, sm2Quality?: number) => Promise<number>;
  markSkipped: (noteId: string) => Promise<void>;
  shareAndEarnXp: () => Promise<void>;

  refresh: () => Promise<void>;
  refreshVacation: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function buildXpInfo(stats: UserStats): XpInfo {
  const info = getXpProgress(stats.totalXp);
  return { totalXp: stats.totalXp, ...info };
}

const DEFAULT_VACATION: VacationSettings = { isActive: false, startDate: 0, endDate: 0, holidayRestActive: false };

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
    totalXp: 0,
    todayCompleted: 0,
    yesterdayCompleted: 0,
    lastXpDate: 0,
  });
  const [vacationSettings, setVacationSettings] = useState<VacationSettings>(DEFAULT_VACATION);
  const [dueNotes, setDueNotes] = useState<{ note: Note; plan: RevisionPlan }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLevelUp, setPendingLevelUp] = useState<LevelUpEvent | null>(null);
  const [pendingXp, setPendingXp] = useState(0);
  const [streakMilestone, setStreakMilestone] = useState<number | null>(null);

  const xpInfo = buildXpInfo(userStats);
  const improvementPct = calcImprovementPct(userStats.todayCompleted, userStats.yesterdayCompleted);

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

  const refreshVacation = useCallback(async () => {
    const vac = await getVacationSettings();
    setVacationSettings(vac);
  }, []);

  useEffect(() => {
    const init = async () => {
      await seedDefaultsIfNeeded();
      await Promise.all([refresh(), refreshVacation()]);
      setIsLoading(false);
      const due = await getDueNotes();
      initNotificationsOnFirstLaunch(due.length).catch(() => {});
    };
    init();
  }, [refresh, refreshVacation]);

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
    intervals: number[],
    mode: "custom" | "sm2" = "custom"
  ) => {
    const note = await createNote(title, categoryId, content, images);
    await createRevisionPlan(note.id, intervals, mode);
    await refresh();
    return note;
  }, [refresh]);

  const editNote = useCallback(async (id: string, updates: Partial<Note>, intervals?: number[], mode?: "custom" | "sm2") => {
    await updateNote(id, updates);
    if (intervals && intervals.length > 0) {
      await createRevisionPlan(id, intervals, mode ?? "custom");
    }
    await refresh();
  }, [refresh]);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    await refresh();
  }, [refresh]);

  const markCompleted = useCallback(async (noteId: string, sm2Quality?: number): Promise<number> => {
    const result = await completeRevision(noteId, sm2Quality);
    await refresh();
    setPendingXp(result.xpGained);
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
  }, [refresh]);

  const markSkipped = useCallback(async (noteId: string) => {
    await skipRevision(noteId);
    const stats = await getUserStats();
    stats.totalSkipped += 1;
    await saveUserStats(stats);
    await refresh();
  }, [refresh]);

  const shareAndEarnXp = useCallback(async () => {
    const result = await awardShareXp();
    setPendingXp(result.xpGained);
    await refresh();
    if (result.leveledUp) {
      const stats = await getUserStats();
      const info = getXpProgress(stats.totalXp);
      setPendingLevelUp({ newLevel: result.newLevel, levelName: info.levelName, xpGained: result.xpGained });
    }
  }, [refresh]);

  const dismissLevelUp = useCallback(() => setPendingLevelUp(null), []);
  const dismissStreakMilestone = useCallback(() => setStreakMilestone(null), []);

  return (
    <AppContext.Provider
      value={{
        categories,
        notes,
        revisionPlans,
        revisionLogs,
        userStats,
        vacationSettings,
        dueNotes,
        isLoading,
        xpInfo,
        improvementPct,
        pendingLevelUp,
        pendingXp,
        streakMilestone,
        dismissLevelUp,
        dismissStreakMilestone,
        addCategory,
        removeCategory,
        addNote,
        editNote,
        removeNote,
        markCompleted,
        markSkipped,
        shareAndEarnXp,
        refresh,
        refreshVacation,
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
