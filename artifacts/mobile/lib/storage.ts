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

export interface NoteAttachment {
  id: string;
  noteId: string;
  uri: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface Note {
  id: string;
  title: string;
  categoryId: string;
  content: string;
  images: NoteImage[];
  attachments?: NoteAttachment[];
  createdAt: number;
  updatedAt: number;
}

export interface RevisionPlan {
  id: string;
  noteId: string;
  intervals: number[];
  currentStep: number;
  nextRevisionDate: number;
}

export interface RevisionLog {
  id: string;
  noteId: string;
  noteTitle: string;
  date: number;
  status: "completed" | "skipped";
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

const KEYS = {
  CATEGORIES: "sr_categories",
  NOTES: "sr_notes",
  REVISION_PLANS: "sr_revision_plans",
  REVISION_LOGS: "sr_revision_logs",
  USER_STATS: "sr_user_stats",
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

export async function renameCategory(id: string, name: string): Promise<void> {
  const cats = await getCategories();
  const trimmed = name.trim();
  if (trimmed.length === 0) return;
  await saveCategories(
    cats.map((c) => (c.id === id ? { ...c, name: trimmed } : c))
  );
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
  images: NoteImage[],
  attachments: NoteAttachment[] = []
): Promise<Note> {
  const notes = await getNotes();
  const note: Note = {
    id: genId(),
    title,
    categoryId,
    content,
    images,
    attachments,
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
  return JSON.parse(raw) as RevisionPlan[];
}

export async function saveRevisionPlans(plans: RevisionPlan[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.REVISION_PLANS, JSON.stringify(plans));
}

export async function createRevisionPlan(
  noteId: string,
  intervals: number[]
): Promise<RevisionPlan> {
  const plans = await getRevisionPlans();
  const today = startOfDay(Date.now());
  const firstInterval = intervals[0] ?? 1;
  const plan: RevisionPlan = {
    id: genId(),
    noteId,
    intervals,
    currentStep: 0,
    nextRevisionDate: today + firstInterval * 24 * 60 * 60 * 1000,
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

export async function updateRevisionPlanSchedule(
  noteId: string,
  intervals: number[]
): Promise<void> {
  const plans = await getRevisionPlans();
  const idx = plans.findIndex((p) => p.noteId === noteId);
  if (idx === -1) {
    await createRevisionPlan(noteId, intervals);
    return;
  }
  plans[idx] = { ...plans[idx], intervals };
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

export async function completeRevision(
  noteId: string
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

  const nextStep = Math.min(plan.currentStep + 1, plan.intervals.length - 1);
  const nextInterval = plan.intervals[nextStep] || plan.intervals[plan.intervals.length - 1];
  plan.currentStep = nextStep;
  plan.nextRevisionDate = startOfDay(Date.now()) + nextInterval * 24 * 60 * 60 * 1000;
  plans[idx] = plan;
  await saveRevisionPlans(plans);
  await logRevision(noteId, "completed");
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

async function logRevision(noteId: string, status: "completed" | "skipped"): Promise<void> {
  const notes = await getNotes();
  const note = notes.find((n) => n.id === noteId);
  const logs = await getRevisionLogs();
  const log: RevisionLog = {
    id: genId(),
    noteId,
    noteTitle: note?.title || "Unknown",
    date: Date.now(),
    status,
  };
  await saveRevisionLogs([...logs, log]);
}

// User Stats
export async function getUserStats(): Promise<UserStats> {
  const raw = await AsyncStorage.getItem(KEYS.USER_STATS);
  if (raw) {
    const parsed = JSON.parse(raw) as Partial<UserStats>;
    const defaults: UserStats = {
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
    };
    return { ...defaults, ...parsed };
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
    dailyGoal: 5,
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

// ── Exam Mode ─────────────────────────────────────────────────────────────────

export interface ExamReviewItem {
  noteId: string;
  sessionIndex: number; // 0–13
  scheduledDate: number; // ms timestamp (start of day)
  completed: boolean;
  completedAt?: number;
}

export interface ExamSession {
  id: string;
  name: string;
  examDate: number; // ms timestamp
  noteIds: string[];
  schedule: ExamReviewItem[];
  createdAt: number;
  isArchived: boolean;
}

const EXAM_SESSIONS_KEY = "sr_exam_sessions";

// 14 proportions – equally spaced across all available days (i / 13)
// Each review lands at a fixed fraction of the total study period
const EXAM_PROPORTIONS = [0, 0.08, 0.15, 0.23, 0.31, 0.38, 0.46, 0.54, 0.62, 0.69, 0.77, 0.85, 0.92, 1.0];

export function generateExamScheduleItems(noteIds: string[], examDate: number): ExamReviewItem[] {
  const today = startOfDay(Date.now());
  const lastDay = startOfDay(examDate) - 24 * 60 * 60 * 1000; // day before exam
  const totalDays = Math.max(0, Math.round((lastDay - today) / (24 * 60 * 60 * 1000)));
  const items: ExamReviewItem[] = [];
  for (const noteId of noteIds) {
    for (let i = 0; i < 14; i++) {
      const dayOffset = Math.min(Math.round(EXAM_PROPORTIONS[i] * totalDays), totalDays);
      items.push({
        noteId,
        sessionIndex: i,
        scheduledDate: today + dayOffset * 24 * 60 * 60 * 1000,
        completed: false,
      });
    }
  }
  return items;
}

export async function getExamSessions(): Promise<ExamSession[]> {
  const raw = await AsyncStorage.getItem(EXAM_SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveExamSessions(sessions: ExamSession[]): Promise<void> {
  await AsyncStorage.setItem(EXAM_SESSIONS_KEY, JSON.stringify(sessions));
}

export async function createExamSession(
  name: string,
  examDate: number,
  noteIds: string[]
): Promise<ExamSession> {
  const sessions = await getExamSessions();
  const schedule = generateExamScheduleItems(noteIds, examDate);
  const session: ExamSession = {
    id: genId(),
    name,
    examDate,
    noteIds,
    schedule,
    createdAt: Date.now(),
    isArchived: false,
  };
  await saveExamSessions([...sessions, session]);
  return session;
}

export async function deleteExamSession(id: string): Promise<void> {
  const sessions = await getExamSessions();
  await saveExamSessions(sessions.filter((s) => s.id !== id));
}

export async function completeExamReviewItem(
  sessionId: string,
  noteId: string,
  sessionIndex: number
): Promise<void> {
  const sessions = await getExamSessions();
  const si = sessions.findIndex((s) => s.id === sessionId);
  if (si === -1) return;
  const itemIdx = sessions[si].schedule.findIndex(
    (item) => item.noteId === noteId && item.sessionIndex === sessionIndex
  );
  if (itemIdx !== -1) {
    sessions[si].schedule[itemIdx] = {
      ...sessions[si].schedule[itemIdx],
      completed: true,
      completedAt: Date.now(),
    };
  }
  await saveExamSessions(sessions);
}

export async function skipExamReviewItem(
  sessionId: string,
  noteId: string,
  sessionIndex: number
): Promise<void> {
  const sessions = await getExamSessions();
  const si = sessions.findIndex((s) => s.id === sessionId);
  if (si === -1) return;
  const session = sessions[si];
  const itemIdx = session.schedule.findIndex(
    (item) => item.noteId === noteId && item.sessionIndex === sessionIndex
  );
  if (itemIdx !== -1) {
    const tomorrow = startOfDay(Date.now()) + 24 * 60 * 60 * 1000;
    const lastDay = startOfDay(session.examDate) - 24 * 60 * 60 * 1000;
    const newDate = Math.min(tomorrow, lastDay);
    if (session.schedule[itemIdx].scheduledDate < tomorrow) {
      sessions[si].schedule[itemIdx] = { ...sessions[si].schedule[itemIdx], scheduledDate: newDate };
    }
  }
  await saveExamSessions(sessions);
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
      { name: "Languages", color: "#ec4899" },
    ];
    for (const d of defaults) {
      await createCategory(d.name, d.color);
    }
  }
  await AsyncStorage.setItem("@recallify_seeded", "1");
}
