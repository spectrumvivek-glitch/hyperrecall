import AsyncStorage from "@react-native-async-storage/async-storage";
import { calcXpForAction, getLevelFromXp } from "./xp";
import { checkNewBadges } from "./badges";

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface NoteImage {
  id: string;
  noteId: string;
  uri: string;
  thumbnailUri: string;
}

export interface Note {
  id: string;
  title: string;
  categoryId: string;
  content: string;
  images: NoteImage[];
  createdAt: number;
  updatedAt: number;
}

export interface RevisionPlan {
  id: string;
  noteId: string;
  intervals: number[];
  currentStep: number;
  nextRevisionDate: number;
  mode: "custom" | "sm2";
  easeFactor: number;
  lastInterval: number;
}

export interface RevisionLog {
  id: string;
  noteId: string;
  noteTitle: string;
  date: number;
  status: "completed" | "skipped";
  quality?: number;
}

export interface UserStats {
  currentStreak: number;
  lastActiveDate: number;
  totalCompleted: number;
  totalSkipped: number;
  totalXp: number;
  todayCompleted: number;
  yesterdayCompleted: number;
  lastXpDate: number;
  earnedBadges: string[];
  dailyGoal: number;
}

export interface VacationSettings {
  isActive: boolean;
  startDate: number;
  endDate: number;
  holidayRestActive: boolean;
}

const KEYS = {
  CATEGORIES: "sr_categories",
  NOTES: "sr_notes",
  REVISION_PLANS: "sr_revision_plans",
  REVISION_LOGS: "sr_revision_logs",
  USER_STATS: "sr_user_stats",
  VACATION: "sr_vacation_settings",
};

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function generateId(): string {
  return genId();
}

// Categories
export async function getCategories(): Promise<Category[]> {
  const raw = await AsyncStorage.getItem(KEYS.CATEGORIES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCategories(cats: Category[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats));
}

export async function createCategory(name: string, color: string): Promise<Category> {
  const cats = await getCategories();
  const cat: Category = { id: genId(), name, color, createdAt: Date.now() };
  await saveCategories([...cats, cat]);
  return cat;
}

export async function deleteCategory(id: string): Promise<void> {
  const cats = await getCategories();
  await saveCategories(cats.filter((c) => c.id !== id));
}

// Notes
export async function getNotes(): Promise<Note[]> {
  const raw = await AsyncStorage.getItem(KEYS.NOTES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
}

export async function createNote(
  title: string,
  categoryId: string,
  content: string,
  images: NoteImage[]
): Promise<Note> {
  const notes = await getNotes();
  const note: Note = {
    id: genId(),
    title,
    categoryId,
    content,
    images,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveNotes([...notes, note]);
  return note;
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<void> {
  const notes = await getNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return;
  notes[idx] = { ...notes[idx], ...updates, updatedAt: Date.now() };
  await saveNotes(notes);
}

export async function deleteNote(id: string): Promise<void> {
  const notes = await getNotes();
  await saveNotes(notes.filter((n) => n.id !== id));
  const plans = await getRevisionPlans();
  await saveRevisionPlans(plans.filter((p) => p.noteId !== id));
}

// Revision Plans
export async function getRevisionPlans(): Promise<RevisionPlan[]> {
  const raw = await AsyncStorage.getItem(KEYS.REVISION_PLANS);
  if (!raw) return [];
  const plans = JSON.parse(raw) as RevisionPlan[];
  return plans.map((p) => ({
    mode: "custom" as const,
    easeFactor: 2.5,
    lastInterval: 1,
    ...p,
  }));
}

export async function saveRevisionPlans(plans: RevisionPlan[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.REVISION_PLANS, JSON.stringify(plans));
}

export async function createRevisionPlan(
  noteId: string,
  intervals: number[],
  mode: "custom" | "sm2" = "custom"
): Promise<RevisionPlan> {
  const plans = await getRevisionPlans();
  const today = startOfDay(Date.now());
  // SM-2 always starts with a 1-day first interval regardless of intervals[]
  const firstInterval = mode === "sm2" ? 1 : (intervals[0] ?? 1);
  const plan: RevisionPlan = {
    id: genId(),
    noteId,
    intervals,
    currentStep: 0,
    nextRevisionDate: today + firstInterval * 24 * 60 * 60 * 1000,
    mode,
    easeFactor: 2.5,
    lastInterval: firstInterval,
  };
  const existing = plans.findIndex((p) => p.noteId === noteId);
  if (existing !== -1) {
    plans[existing] = plan;
  } else {
    plans.push(plan);
  }
  await saveRevisionPlans(plans);
  return plan;
}

/**
 * Smart update for an existing revision plan:
 * - If mode changed → create a fresh plan (resets SM-2 state, schedule)
 * - If mode unchanged (SM-2 → SM-2) → only update the intervals[], preserve all SM-2 state
 * - If mode unchanged (custom → custom) → update intervals, keep nextRevisionDate & currentStep
 */
export async function updateRevisionPlanSchedule(
  noteId: string,
  intervals: number[],
  mode: "custom" | "sm2"
): Promise<void> {
  const plans = await getRevisionPlans();
  const idx = plans.findIndex((p) => p.noteId === noteId);

  if (idx === -1) {
    // No existing plan — create fresh
    await createRevisionPlan(noteId, intervals, mode);
    return;
  }

  const existing = plans[idx];

  if (existing.mode !== mode) {
    // Mode changed — full reset
    await createRevisionPlan(noteId, intervals, mode);
    return;
  }

  // Same mode — preserve all scheduling state, just update intervals metadata
  plans[idx] = { ...existing, intervals };
  await saveRevisionPlans(plans);
}

export async function getDueNotes(): Promise<{ note: Note; plan: RevisionPlan }[]> {
  const today = startOfDay(Date.now());
  const tomorrow = today + 24 * 60 * 60 * 1000;
  const [notes, plans] = await Promise.all([getNotes(), getRevisionPlans()]);
  const noteMap = new Map(notes.map((n) => [n.id, n]));
  return plans
    .filter((p) => p.nextRevisionDate < tomorrow)
    .map((p) => ({ note: noteMap.get(p.noteId)!, plan: p }))
    .filter((item) => !!item.note);
}

// SM-2 algorithm
function computeSM2NextInterval(plan: RevisionPlan, quality: number): { nextInterval: number; newEaseFactor: number } {
  let ef = plan.easeFactor;
  let interval: number;

  if (quality < 3) {
    interval = 1;
  } else {
    if (plan.currentStep === 0) interval = 1;
    else if (plan.currentStep === 1) interval = 6;
    else interval = Math.round(plan.lastInterval * ef);
  }

  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ef = Math.max(1.3, ef);
  interval = Math.max(1, interval);

  return { nextInterval: interval, newEaseFactor: ef };
}

export async function completeRevision(
  noteId: string,
  sm2Quality?: number
): Promise<{
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  streakMilestone?: number;
  newBadges: string[];
}> {
  const plans = await getRevisionPlans();
  const idx = plans.findIndex((p) => p.noteId === noteId);
  if (idx === -1) return { xpGained: 0, leveledUp: false, newLevel: 1, newBadges: [] };
  const plan = plans[idx];

  let nextInterval: number;
  if (plan.mode === "sm2" && sm2Quality !== undefined) {
    const { nextInterval: ni, newEaseFactor } = computeSM2NextInterval(plan, sm2Quality);
    nextInterval = ni;
    plan.easeFactor = newEaseFactor;
    if (sm2Quality < 3) {
      plan.currentStep = 0;
    } else {
      plan.currentStep += 1;
    }
    plan.lastInterval = nextInterval;
  } else {
    const nextStep = Math.min(plan.currentStep + 1, plan.intervals.length - 1);
    nextInterval = plan.intervals[nextStep] || plan.intervals[plan.intervals.length - 1];
    plan.currentStep = nextStep;
    plan.lastInterval = nextInterval;
  }

  plan.nextRevisionDate = startOfDay(Date.now()) + nextInterval * 24 * 60 * 60 * 1000;
  plans[idx] = plan;
  await saveRevisionPlans(plans);
  await logRevision(noteId, "completed", sm2Quality);
  return await updateStreak();
}

export async function skipRevision(noteId: string): Promise<void> {
  await logRevision(noteId, "skipped");
  // Push the note's due date to tomorrow so it leaves today's list
  const plans = await getRevisionPlans();
  const idx = plans.findIndex((p) => p.noteId === noteId);
  if (idx !== -1) {
    const tomorrow = startOfDay(Date.now()) + 24 * 60 * 60 * 1000;
    // Only push forward — never move it backward if already scheduled later
    if (plans[idx].nextRevisionDate < tomorrow) {
      plans[idx] = { ...plans[idx], nextRevisionDate: tomorrow };
      await saveRevisionPlans(plans);
    }
  }
}

// Revision Logs
export async function getRevisionLogs(): Promise<RevisionLog[]> {
  const raw = await AsyncStorage.getItem(KEYS.REVISION_LOGS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveRevisionLogs(logs: RevisionLog[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.REVISION_LOGS, JSON.stringify(logs));
}

async function logRevision(noteId: string, status: "completed" | "skipped", quality?: number): Promise<void> {
  const notes = await getNotes();
  const note = notes.find((n) => n.id === noteId);
  const logs = await getRevisionLogs();
  const log: RevisionLog = {
    id: genId(),
    noteId,
    noteTitle: note?.title || "Unknown",
    date: Date.now(),
    status,
    quality,
  };
  await saveRevisionLogs([...logs, log]);
}

// User Stats
export async function getUserStats(): Promise<UserStats> {
  const raw = await AsyncStorage.getItem(KEYS.USER_STATS);
  if (raw) {
    const parsed = JSON.parse(raw) as UserStats;
    return {
      totalXp: 0,
      todayCompleted: 0,
      yesterdayCompleted: 0,
      lastXpDate: 0,
      earnedBadges: [],
      dailyGoal: 10,
      ...parsed,
    };
  }
  return {
    currentStreak: 0,
    lastActiveDate: 0,
    totalCompleted: 0,
    totalSkipped: 0,
    totalXp: 0,
    todayCompleted: 0,
    yesterdayCompleted: 0,
    lastXpDate: 0,
    earnedBadges: [],
    dailyGoal: 10,
  };
}

export async function saveUserStats(stats: UserStats): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(stats));
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 100, 180, 365];

async function updateStreak(): Promise<{
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  streakMilestone?: number;
  newBadges: string[];
}> {
  const stats = await getUserStats();
  const today = startOfDay(Date.now());
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastActive = startOfDay(stats.lastActiveDate);
  const lastXpDay = startOfDay(stats.lastXpDate || 0);
  let streakMilestone: number | undefined;

  if (lastActive !== today) {
    if (lastActive === yesterday) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.lastActiveDate = Date.now();
  }
  stats.totalCompleted += 1;

  if (lastXpDay !== today) {
    stats.yesterdayCompleted = stats.todayCompleted;
    stats.todayCompleted = 0;
    stats.lastXpDate = Date.now();
  }
  stats.todayCompleted += 1;

  const prevLevel = getLevelFromXp(stats.totalXp);
  let xpGained = calcXpForAction(stats.currentStreak, false);

  if (STREAK_MILESTONES.includes(stats.currentStreak)) {
    xpGained += 50;
    streakMilestone = stats.currentStreak;
  }

  stats.totalXp += xpGained;
  const newLevel = getLevelFromXp(stats.totalXp);
  const leveledUp = newLevel > prevLevel;

  // Check for newly earned badges
  const newBadges = checkNewBadges(
    {
      currentStreak: stats.currentStreak,
      totalCompleted: stats.totalCompleted,
      todayCompleted: stats.todayCompleted,
      totalXp: stats.totalXp,
    },
    newLevel,
    stats.earnedBadges
  );

  if (newBadges.length > 0) {
    stats.earnedBadges = [...(stats.earnedBadges ?? []), ...newBadges];
  }

  await saveUserStats(stats);
  return { xpGained, leveledUp, newLevel, streakMilestone, newBadges };
}

export async function awardShareXp(): Promise<{ xpGained: number; leveledUp: boolean; newLevel: number }> {
  const stats = await getUserStats();
  const prevLevel = getLevelFromXp(stats.totalXp);
  const xpGained = 10;
  stats.totalXp += xpGained;
  const newLevel = getLevelFromXp(stats.totalXp);
  const leveledUp = newLevel > prevLevel;
  await saveUserStats(stats);
  return { xpGained, leveledUp, newLevel };
}

export async function awardCategoryCompletionXp(categoryId: string): Promise<boolean> {
  const [notes, plans, dueAll] = await Promise.all([getNotes(), getRevisionPlans(), getDueNotes()]);
  const catNotes = notes.filter((n) => n.categoryId === categoryId);
  if (catNotes.length === 0) return false;
  const dueCatIds = new Set(dueAll.filter((d) => d.note.categoryId === categoryId).map((d) => d.note.id));
  if (dueCatIds.size > 0) return false;
  const stats = await getUserStats();
  stats.totalXp += 100;
  await saveUserStats(stats);
  return true;
}

// Vacation Mode
export async function getVacationSettings(): Promise<VacationSettings> {
  const raw = await AsyncStorage.getItem(KEYS.VACATION);
  if (raw) return JSON.parse(raw);
  return { isActive: false, startDate: 0, endDate: 0, holidayRestActive: false };
}

export async function saveVacationSettings(settings: VacationSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.VACATION, JSON.stringify(settings));
}

export async function activateVacation(startDate: number, endDate: number): Promise<void> {
  const vacDays = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
  const shiftMs = vacDays * 24 * 60 * 60 * 1000;
  const plans = await getRevisionPlans();
  const shifted = plans.map((p) => ({ ...p, nextRevisionDate: p.nextRevisionDate + shiftMs }));
  await saveRevisionPlans(shifted);
  await saveVacationSettings({ isActive: true, startDate, endDate, holidayRestActive: false });
}

export async function deactivateVacation(): Promise<void> {
  const settings = await getVacationSettings();
  await saveVacationSettings({ ...settings, isActive: false });
}

export async function activateHolidayRest(restDate: number): Promise<void> {
  const restDayStart = startOfDay(restDate);
  const nextDayStart = restDayStart + 24 * 60 * 60 * 1000;
  const plans = await getRevisionPlans();
  const shifted = plans.map((p) => {
    const dueDayStart = startOfDay(p.nextRevisionDate);
    if (dueDayStart === restDayStart) {
      return { ...p, nextRevisionDate: nextDayStart };
    }
    return p;
  });
  await saveRevisionPlans(shifted);
  const settings = await getVacationSettings();
  await saveVacationSettings({ ...settings, holidayRestActive: false });
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function getDayLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Seed default categories if empty
export async function seedDefaultsIfNeeded(): Promise<void> {
  // Fast path: skip the category check on every subsequent launch
  const seeded = await AsyncStorage.getItem("@recallify_seeded");
  if (seeded === "1") return;

  const cats = await getCategories();
  if (cats.length === 0) {
    const defaults = [
      { name: "Mathematics", color: "#4f46e5" },
      { name: "Science", color: "#10b981" },
      { name: "History", color: "#f59e0b" },
      { name: "Languages", color: "#ec4899" },
    ];
    for (const d of defaults) {
      await createCategory(d.name, d.color);
    }
  }
  await AsyncStorage.setItem("@recallify_seeded", "1");
}
