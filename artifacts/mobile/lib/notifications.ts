import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIF_ENABLED_KEY = "@studybrain/notif_enabled";
const NOTIF_HOUR_KEY = "@studybrain/notif_hour";
const NOTIF_MINUTE_KEY = "@studybrain/notif_minute";

export const DEFAULT_HOUR = 9;
export const DEFAULT_MINUTE = 0;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
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
    // null means never set → default to true (enabled)
    enabled: enabled !== "false",
    hour: hour !== null ? parseInt(hour, 10) : DEFAULT_HOUR,
    minute: minute !== null ? parseInt(minute, 10) : DEFAULT_MINUTE,
  };
}

export async function initNotificationsOnFirstLaunch(dueCount: number): Promise<void> {
  if (Platform.OS === "web") return;
  const raw = await AsyncStorage.getItem(NOTIF_ENABLED_KEY);
  if (raw !== null) return; // already set, don't override
  const granted = await requestNotificationPermission();
  if (granted) {
    await saveNotificationSettings(true, DEFAULT_HOUR, DEFAULT_MINUTE);
    await scheduleDailyRevisionReminder(DEFAULT_HOUR, DEFAULT_MINUTE, dueCount);
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
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDailyRevisionReminder(
  hour: number,
  minute: number,
  dueCount: number
): Promise<void> {
  if (Platform.OS === "web") return;

  await cancelAllRevisionNotifications();

  if (dueCount === 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Recallify — Keep it up! 🎉",
        body: "No cards due today. Add new notes to stay ahead.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Recallify — ${dueCount} card${dueCount > 1 ? "s" : ""} due today 📚`,
        body: "Time to revise! Tap to start your session.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}
