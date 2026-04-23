import AsyncStorage from "@react-native-async-storage/async-storage";

const TRIAL_START_KEY = "@hyperrecall/trial_start_at";
export const TRIAL_DURATION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface TrialState {
  startedAt: number;
  endsAt: number;
  isActive: boolean;
  daysRemaining: number;
  hasEverStarted: boolean;
}

export async function getOrInitTrialStart(): Promise<number> {
  const raw = await AsyncStorage.getItem(TRIAL_START_KEY);
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const now = Date.now();
  await AsyncStorage.setItem(TRIAL_START_KEY, String(now));
  return now;
}

export async function readTrialStart(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(TRIAL_START_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function computeTrialState(startedAt: number | null): TrialState {
  if (!startedAt) {
    return {
      startedAt: 0,
      endsAt: 0,
      isActive: false,
      daysRemaining: 0,
      hasEverStarted: false,
    };
  }
  const endsAt = startedAt + TRIAL_DURATION_DAYS * MS_PER_DAY;
  const now = Date.now();
  const msLeft = endsAt - now;
  const daysRemaining = Math.max(0, Math.ceil(msLeft / MS_PER_DAY));
  return {
    startedAt,
    endsAt,
    isActive: msLeft > 0,
    daysRemaining,
    hasEverStarted: true,
  };
}
