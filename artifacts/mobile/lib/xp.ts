export const XP_PER_CARD = 10;
export const XP_STREAK_BONUS = 5;
export const XP_DAILY_SWEEP_BONUS = 25;

/**
 * 100-level progression — Free-Fire-style curve.
 *
 * Each level needs:   xpForNext(L) = 60 + L*40 + L*L*6
 *
 *  L  1  →  next 106 xp     (total to reach L2  = 106)
 *  L 10 →  next 1,060 xp    (total to reach L11 ≈ 4,150)
 *  L 25 →  next 4,810 xp    (total to reach L26 ≈ 41,000)
 *  L 50 →  next 17,060 xp   (total to reach L51 ≈ 277,000)
 *  L 80 →  next 41,660 xp   (total to reach L81 ≈ 1.07M)
 *  L 99 →  next 62,826 xp   (total to reach L100 ≈ 2.14M)
 *
 * Result: easy to reach L5–L10, properly grindy past L40, prestige
 * tier 80+, and "untouchable" at L100 (HyperRecall God).
 */
const LEVEL_NAMES = [
  // 1-10 — Rookie tier
  "Beginner", "Novice", "Rookie", "Apprentice", "Cadet",
  "Trainee", "Recruit", "Initiate", "Pupil", "Disciple",
  // 11-20 — Explorer tier
  "Learner", "Student", "Pathfinder", "Explorer", "Wanderer",
  "Seeker", "Voyager", "Adventurer", "Tracker", "Trailblazer",
  // 21-30 — Scholar tier
  "Scholar", "Bookworm", "Reader", "Researcher", "Investigator",
  "Analyst", "Strategist", "Tactician", "Planner", "Architect",
  // 31-40 — Thinker tier
  "Thinker", "Reasoner", "Logician", "Philosopher", "Theorist",
  "Visionary", "Innovator", "Inventor", "Creator", "Designer",
  // 41-50 — Mentor tier
  "Mentor", "Guide", "Coach", "Tutor", "Instructor",
  "Professor", "Lecturer", "Educator", "Sensei", "Guru",
  // 51-60 — Sage tier
  "Sage", "Wise One", "Oracle", "Seer", "Mystic",
  "Enlightened", "Awakened", "Illuminated", "Pioneer", "Prodigy",
  // 61-70 — Genius tier
  "Genius", "Mastermind", "Brainiac", "Polymath", "Savant",
  "Virtuoso", "Maestro", "Adept", "Expert", "Authority",
  // 71-80 — Champion tier
  "Master", "Grandmaster", "Champion", "Conqueror", "Vanquisher",
  "Triumphant", "Victor", "Hero", "Warrior Sage", "Knight",
  // 81-90 — Guardian tier
  "Paladin", "Guardian", "Sentinel", "Warden", "Protector",
  "Defender", "Ascendant", "Transcendent", "Celestial", "Divine",
  // 91-100 — Mythic tier
  "Legend", "Mythic", "Immortal", "Eternal", "Cosmic",
  "Stellar", "Galactic", "Universal", "Omniscient", "HyperRecall God",
];

export const MAX_LEVEL = LEVEL_NAMES.length; // 100

export function xpForNextLevel(level: number): number {
  // Cap requirement at MAX_LEVEL — once at level 100 there is no next.
  if (level >= MAX_LEVEL) return 0;
  return 60 + level * 40 + level * level * 6;
}

export function xpThreshold(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += 60 + i * 40 + i * i * 6;
  }
  return total;
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  // Cap at MAX_LEVEL so we never run away on huge XP totals.
  while (level < MAX_LEVEL && xp >= xpThreshold(level + 1)) level++;
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
  // At MAX_LEVEL `needed` is 0 — show the bar as full and avoid /0.
  const progressPct = needed === 0 ? 1 : Math.min(xpIntoLevel / needed, 1);
  return {
    level,
    levelName: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)],
    xpIntoLevel,
    xpNeeded: needed,
    progressPct,
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

// Big celebration milestones — every prestige tier gets one.
export const LEVEL_MILESTONES = [5, 10, 25, 50, 75, 100];
