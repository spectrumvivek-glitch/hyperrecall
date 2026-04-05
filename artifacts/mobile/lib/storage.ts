import AsyncStorage from "@react-native-async-storage/async-storage";

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
  return raw ? JSON.parse(raw) : [];
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
  const plan: RevisionPlan = {
    id: genId(),
    noteId,
    intervals,
    currentStep: 0,
    nextRevisionDate: today + (intervals[0] || 1) * 24 * 60 * 60 * 1000,
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

export async function completeRevision(noteId: string): Promise<void> {
  const plans = await getRevisionPlans();
  const idx = plans.findIndex((p) => p.noteId === noteId);
  if (idx === -1) return;
  const plan = plans[idx];
  const nextStep = Math.min(plan.currentStep + 1, plan.intervals.length - 1);
  const daysUntilNext = plan.intervals[nextStep] || plan.intervals[plan.intervals.length - 1];
  plan.currentStep = nextStep;
  plan.nextRevisionDate = startOfDay(Date.now()) + daysUntilNext * 24 * 60 * 60 * 1000;
  plans[idx] = plan;
  await saveRevisionPlans(plans);
  await logRevision(noteId, "completed");
  await updateStreak();
}

export async function skipRevision(noteId: string): Promise<void> {
  await logRevision(noteId, "skipped");
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
  if (raw) return JSON.parse(raw);
  return { currentStreak: 0, lastActiveDate: 0, totalCompleted: 0, totalSkipped: 0 };
}

export async function saveUserStats(stats: UserStats): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_STATS, JSON.stringify(stats));
}

async function updateStreak(): Promise<void> {
  const stats = await getUserStats();
  const today = startOfDay(Date.now());
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastActive = startOfDay(stats.lastActiveDate);

  if (lastActive === today) {
    stats.totalCompleted += 1;
  } else if (lastActive === yesterday) {
    stats.currentStreak += 1;
    stats.totalCompleted += 1;
    stats.lastActiveDate = Date.now();
  } else {
    stats.currentStreak = 1;
    stats.totalCompleted += 1;
    stats.lastActiveDate = Date.now();
  }
  await saveUserStats(stats);
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
}
