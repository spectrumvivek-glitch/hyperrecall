export const XP_PER_CARD = 10;
export const XP_STREAK_BONUS = 5;
export const XP_DAILY_SWEEP_BONUS = 25;

const LEVEL_NAMES = [
  "Beginner", "Explorer", "Learner", "Scholar",
  "Thinker", "Sage", "Master", "Grandmaster",
  "Legend", "Genius",
];

export function xpThreshold(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) total += 100 + (i - 1) * 50;
  return total;
}

export function xpForNextLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpThreshold(level + 1)) level++;
  return level;
}

export function getXpProgress(xp: number): {
  level: number;
  levelName: string;
  xpIntoLevel: number;
  xpNeeded: number;
  progressPct: number;
} {
  const level = getLevelFromXp(xp);
  const base = xpThreshold(level);
  const needed = xpForNextLevel(level);
  const xpIntoLevel = xp - base;
  return {
    level,
    levelName: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)],
    xpIntoLevel,
    xpNeeded: needed,
    progressPct: Math.min(xpIntoLevel / needed, 1),
  };
}

export function calcXpForAction(
  streak: number,
  isLastCardOfDay: boolean
): number {
  let xp = XP_PER_CARD;
  if (streak >= 3) xp += XP_STREAK_BONUS;
  if (isLastCardOfDay) xp += XP_DAILY_SWEEP_BONUS;
  return xp;
}

export function calcImprovementPct(today: number, yesterday: number): number | null {
  if (yesterday === 0) return today > 0 ? 100 : null;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return pct;
}

export const LEVEL_MILESTONES = [5, 10, 20, 50];
