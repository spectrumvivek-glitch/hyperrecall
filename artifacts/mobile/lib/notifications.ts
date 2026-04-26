import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import type { Note, RevisionPlan } from "./storage";
import {
  getNotes,
  getRevisionLogs,
  getRevisionPlans,
  getUserStats,
  startOfDay,
} from "./storage";

const NOTIF_ENABLED_KEY = "@studybrain/notif_enabled";
const NOTIF_HOUR_KEY = "@studybrain/notif_hour";
const NOTIF_MINUTE_KEY = "@studybrain/notif_minute";
const STREAK_NOTIF_ENABLED_KEY = "@studybrain/streak_notif_enabled";
const STREAK_NOTIF_HOUR_KEY = "@studybrain/streak_notif_hour";
const STREAK_NOTIF_MINUTE_KEY = "@studybrain/streak_notif_minute";

export const DEFAULT_HOUR = 9;
export const DEFAULT_MINUTE = 0;
export const DEFAULT_STREAK_HOUR = 21;
export const DEFAULT_STREAK_MINUTE = 0;

const REMINDER_PREFIX = "hr-due-";
const STREAK_PREFIX = "hr-streak-";
const WINDOW_DAYS = 7;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let Notif: typeof import("expo-notifications") | null = null;
let notifAvailable = false;

try {
  Notif = require("expo-notifications") as typeof import("expo-notifications");
  notifAvailable = true;
} catch {
  notifAvailable = false;
}

if (notifAvailable && Notif) {
  try {
    Notif.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    notifAvailable = false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web" || !notifAvailable || !Notif) return false;
  try {
    const { status: existing } = await Notif.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notif.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  streakEnabled: boolean;
  streakHour: number;
  streakMinute: number;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const [enabled, hour, minute, sEnabled, sHour, sMinute] = await Promise.all([
    AsyncStorage.getItem(NOTIF_ENABLED_KEY),
    AsyncStorage.getItem(NOTIF_HOUR_KEY),
    AsyncStorage.getItem(NOTIF_MINUTE_KEY),
    AsyncStorage.getItem(STREAK_NOTIF_ENABLED_KEY),
    AsyncStorage.getItem(STREAK_NOTIF_HOUR_KEY),
    AsyncStorage.getItem(STREAK_NOTIF_MINUTE_KEY),
  ]);
  return {
    enabled: enabled !== "false",
    hour: hour !== null ? parseInt(hour, 10) : DEFAULT_HOUR,
    minute: minute !== null ? parseInt(minute, 10) : DEFAULT_MINUTE,
    streakEnabled: sEnabled !== "false",
    streakHour: sHour !== null ? parseInt(sHour, 10) : DEFAULT_STREAK_HOUR,
    streakMinute: sMinute !== null ? parseInt(sMinute, 10) : DEFAULT_STREAK_MINUTE,
  };
}

export async function saveNotificationSettings(
  enabled: boolean,
  hour: number,
  minute: number
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(NOTIF_ENABLED_KEY, enabled ? "true" : "false"),
    AsyncStorage.setItem(NOTIF_HOUR_KEY, hour.toString()),
    AsyncStorage.setItem(NOTIF_MINUTE_KEY, minute.toString()),
  ]);
}

export async function saveStreakNotificationSettings(
  enabled: boolean,
  hour: number,
  minute: number
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STREAK_NOTIF_ENABLED_KEY, enabled ? "true" : "false"),
    AsyncStorage.setItem(STREAK_NOTIF_HOUR_KEY, hour.toString()),
    AsyncStorage.setItem(STREAK_NOTIF_MINUTE_KEY, minute.toString()),
  ]);
}

async function cancelByPrefix(prefix: string): Promise<void> {
  if (!notifAvailable || !Notif) return;
  try {
    const all = await Notif.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => typeof n.identifier === "string" && n.identifier.startsWith(prefix))
        .map((n) => Notif!.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // ignore
  }
}

export async function cancelAllRevisionNotifications(): Promise<void> {
  if (Platform.OS === "web" || !notifAvailable) return;
  await Promise.all([cancelByPrefix(REMINDER_PREFIX), cancelByPrefix(STREAK_PREFIX)]);
}

/**
 * Returns the notes whose revision plan would be due on or before the end
 * of the given day (i.e. cumulative — overdue items roll forward).
 */
export function predictDueNotesForDate(
  plans: RevisionPlan[],
  notes: Note[],
  dayStart: number
): Note[] {
  const dayEnd = dayStart + ONE_DAY_MS;
  const noteMap = new Map(notes.map((n) => [n.id, n]));
  return plans
    .filter((p) => p.nextRevisionDate < dayEnd)
    .map((p) => noteMap.get(p.noteId))
    .filter((n): n is Note => !!n);
}

/** Build the reminder title + body for a given list of due notes. */
export function buildReminderContent(dueNotes: Note[]): { title: string; body: string } {
  if (dueNotes.length === 0) {
    return {
      title: "HyperRecall — All caught up! ✨",
      body: "No reviews due today. Add new notes or take a well-earned break.",
    };
  }
  const titles = dueNotes
    .map((n) => (n.title || "Untitled").trim())
    .filter((t) => t.length > 0);
  const head = titles.slice(0, 3).join(", ");
  const remaining = titles.length - 3;
  const body = remaining > 0 ? `${head} (+${remaining} more)` : head || "Time to revise!";
  return {
    title: `HyperRecall — ${dueNotes.length} note${dueNotes.length > 1 ? "s" : ""} due today 📚`,
    body,
  };
}

function buildStreakContent(streak: number): { title: string; body: string } {
  return {
    title: `Don't break your ${streak}-day streak! 🔥`,
    body: "Open HyperRecall and revise just 1 note to keep your streak alive.",
  };
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function dateAt(dayStart: number, hour: number, minute: number): Date {
  const d = new Date(dayStart);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function scheduleRevisionReminderWindow(
  hour: number,
  minute: number,
  plans: RevisionPlan[],
  notes: Note[]
): Promise<void> {
  if (Platform.OS === "web" || !notifAvailable || !Notif) return;
  await cancelByPrefix(REMINDER_PREFIX);
  const today = startOfDay(Date.now());
  const now = Date.now();
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const dayStart = today + i * ONE_DAY_MS;
    const fireAt = dateAt(dayStart, hour, minute);
    if (fireAt.getTime() <= now) continue;
    const due = predictDueNotesForDate(plans, notes, dayStart);
    const content = buildReminderContent(due);
    try {
      await Notif.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${dayKey(dayStart)}`,
        content: { ...content, sound: true },
        trigger: {
          type: Notif.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
    } catch {
      // ignore individual scheduling failures
    }
  }
}

async function scheduleStreakSaverWindow(
  hour: number,
  minute: number,
  currentStreak: number,
  hasReviewedToday: boolean
): Promise<void> {
  if (Platform.OS === "web" || !notifAvailable || !Notif) return;
  await cancelByPrefix(STREAK_PREFIX);
  // No streak to protect — schedule nothing.
  if (currentStreak <= 0) return;
  const today = startOfDay(Date.now());
  const now = Date.now();
  const content = buildStreakContent(currentStreak);
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const dayStart = today + i * ONE_DAY_MS;
    // Skip today if the user has already reviewed today — no need to nag.
    if (i === 0 && hasReviewedToday) continue;
    const fireAt = dateAt(dayStart, hour, minute);
    if (fireAt.getTime() <= now) continue;
    try {
      await Notif.scheduleNotificationAsync({
        identifier: `${STREAK_PREFIX}${dayKey(dayStart)}`,
        content: { ...content, sound: true },
        trigger: {
          type: Notif.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Loads the current state needed to schedule reminders and runs both
 * window schedulers. Always reads fresh from storage so callers cannot
 * accidentally pass a stale snapshot (e.g. an outdated `hasReviewedToday`).
 */
async function performReschedule(): Promise<void> {
  if (Platform.OS === "web" || !notifAvailable) return;
  const settings = await getNotificationSettings();
  if (!settings.enabled) {
    await cancelAllRevisionNotifications();
    return;
  }
  const [plans, notes, stats, logs] = await Promise.all([
    getRevisionPlans(),
    getNotes(),
    getUserStats(),
    getRevisionLogs(),
  ]);
  const todayStart = startOfDay(Date.now());
  const hasReviewedToday = logs.some(
    (l) => l.status === "completed" && l.date >= todayStart
  );
  await scheduleRevisionReminderWindow(
    settings.hour,
    settings.minute,
    plans,
    notes
  );
  if (settings.streakEnabled) {
    await scheduleStreakSaverWindow(
      settings.streakHour,
      settings.streakMinute,
      stats.currentStreak,
      hasReviewedToday
    );
  } else {
    await cancelByPrefix(STREAK_PREFIX);
  }
}

let rescheduleTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;

/**
 * Debounced re-scheduler. Reads the latest state from storage at flush
 * time so it always uses fresh values. Safe to call after every refresh,
 * completion, skip, settings change, or note CRUD operation.
 */
export function rescheduleAllReminders(): void {
  if (Platform.OS === "web" || !notifAvailable) return;
  if (rescheduleTimer) clearTimeout(rescheduleTimer);
  rescheduleTimer = setTimeout(() => {
    rescheduleTimer = null;
    performReschedule().catch(() => {});
  }, DEBOUNCE_MS);
}

export async function initNotificationsOnFirstLaunch(): Promise<void> {
  if (Platform.OS === "web" || !notifAvailable) return;
  try {
    const raw = await AsyncStorage.getItem(NOTIF_ENABLED_KEY);
    if (raw !== null) return;
    const granted = await requestNotificationPermission();
    if (!granted) return;
    await Promise.all([
      saveNotificationSettings(true, DEFAULT_HOUR, DEFAULT_MINUTE),
      saveStreakNotificationSettings(true, DEFAULT_STREAK_HOUR, DEFAULT_STREAK_MINUTE),
    ]);
    await performReschedule();
  } catch {
    // ignore
  }
}

// Note: we keep the type export for backwards compatibility, but callers
// no longer need to construct it themselves.
export interface ReschedulePayload {
  plans: RevisionPlan[];
  notes: Note[];
  currentStreak: number;
  hasReviewedToday: boolean;
}

// Dedupe processed taps by request identifier so cold-start handling
// (getLastNotificationResponseAsync) and the live listener don't double-fire,
// and so we don't re-handle a stale "last response" on a subsequent launch.
const handledResponseIds = new Set<string>();

type NotifResponse = Awaited<
  ReturnType<typeof import("expo-notifications").getLastNotificationResponseAsync>
>;

function processTap(response: NotifResponse, onTap: () => void): void {
  if (!response) return;
  const id = response.notification?.request?.identifier;
  // If the platform doesn't surface an id, fall back to firing once per app
  // session by using a sentinel so we don't get an infinite loop of taps.
  const key = id || "__no_id__";
  if (handledResponseIds.has(key)) return;
  handledResponseIds.add(key);
  try {
    onTap();
  } catch {
    // ignore
  }
}

// Some expo-notifications SDK versions expose a clear API and some don't.
// Type it as an optional method so we can feature-detect without `any`.
type NotifMaybeClearable = typeof import("expo-notifications") & {
  clearLastNotificationResponseAsync?: () => Promise<void>;
};

/**
 * Subscribe to notification taps. Returns an unsubscribe function. Safe to
 * call when notifications are unavailable — returns a no-op cleaner.
 *
 * Also processes the "last response" — i.e. a tap that opened the app
 * from a fully terminated state — so cold-start opens still route correctly.
 * Deduplicates by request identifier so the cold-start path and the live
 * listener can't both fire for the same tap.
 */
export function addNotificationTapListener(onTap: () => void): () => void {
  if (Platform.OS === "web" || !notifAvailable || !Notif) return () => {};
  const notif = Notif;
  // Cold-start handling.
  try {
    notif
      .getLastNotificationResponseAsync()
      .then((resp) => {
        processTap(resp, onTap);
        // Best-effort clear so a future launch without a fresh tap doesn't
        // replay this same response. Not all SDK versions expose this — guard.
        const clear = (notif as NotifMaybeClearable).clearLastNotificationResponseAsync;
        if (typeof clear === "function") {
          clear().catch(() => {});
        }
      })
      .catch(() => {});
  } catch {
    // ignore
  }
  try {
    const sub = notif.addNotificationResponseReceivedListener((resp) => {
      processTap(resp, onTap);
    });
    return () => {
      try {
        sub.remove();
      } catch {
        // ignore
      }
    };
  } catch {
    return () => {};
  }
}

export function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

export function isNotificationsAvailable(): boolean {
  return notifAvailable && Platform.OS !== "web";
}
