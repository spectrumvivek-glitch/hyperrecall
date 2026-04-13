import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const NOTIF_ENABLED_KEY = "@studybrain/notif_enabled";
const NOTIF_HOUR_KEY = "@studybrain/notif_hour";
const NOTIF_MINUTE_KEY = "@studybrain/notif_minute";

export const DEFAULT_HOUR = 9;
export const DEFAULT_MINUTE = 0;

// Safely load expo-notifications — it throws at import time in Expo Go (Android, SDK 53+)
// because remote notifications were removed. We gracefully degrade to a no-op.
let Notif: typeof import("expo-notifications") | null = null;
let notifAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notif = require("expo-notifications") as typeof import("expo-notifications");
  notifAvailable = true;
} catch {
  // Running in Expo Go on Android SDK 53+: notifications not supported, silently skip.
  notifAvailable = false;
}

// Set up notification handler only when available
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

export async function getNotificationSettings(): Promise<{
  enabled: boolean;
  hour: number;
  minute: number;
}> {
  const [enabled, hour, minute] = await Promise.all([
    AsyncStorage.getItem(NOTIF_ENABLED_KEY),
    AsyncStorage.getItem(NOTIF_HOUR_KEY),
    AsyncStorage.getItem(NOTIF_MINUTE_KEY),
  ]);
  return {
    enabled: enabled !== "false",
    hour: hour !== null ? parseInt(hour, 10) : DEFAULT_HOUR,
    minute: minute !== null ? parseInt(minute, 10) : DEFAULT_MINUTE,
  };
}

export async function initNotificationsOnFirstLaunch(dueCount: number): Promise<void> {
  if (Platform.OS === "web" || !notifAvailable) return;
  try {
    const raw = await AsyncStorage.getItem(NOTIF_ENABLED_KEY);
    if (raw !== null) return;
    const granted = await requestNotificationPermission();
    if (granted) {
      await saveNotificationSettings(true, DEFAULT_HOUR, DEFAULT_MINUTE);
      await scheduleDailyRevisionReminder(DEFAULT_HOUR, DEFAULT_MINUTE, dueCount);
    }
  } catch {
    // ignore
  }
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

export async function cancelAllRevisionNotifications(): Promise<void> {
  if (Platform.OS === "web" || !notifAvailable || !Notif) return;
  try {
    await Notif.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function scheduleDailyRevisionReminder(
  hour: number,
  minute: number,
  dueCount: number
): Promise<void> {
  if (Platform.OS === "web" || !notifAvailable || !Notif) return;
  try {
    await cancelAllRevisionNotifications();

    const content =
      dueCount === 0
        ? {
            title: "Recallify — Keep it up! 🎉",
            body: "No cards due today. Add new notes to stay ahead.",
            sound: true,
          }
        : {
            title: `Recallify — ${dueCount} card${dueCount > 1 ? "s" : ""} due today 📚`,
            body: "Time to revise! Tap to start your session.",
            sound: true,
          };

    await Notif.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notif.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch {
    // ignore scheduling failures (e.g. permission denied)
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
