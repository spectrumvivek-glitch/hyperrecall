// Rank ladder — Free Fire-style competitive progression.
//
// 9 pre-Boss ranks × 5 steps × 20 reviews per step = 900 reviews to max out
// God Master V. After that, a 100-review "promotion gap" gates entry to The
// Boss I at 1000 total reviews. The Boss has 5 steps of 20 reviews each
// (1000 → 1100 max). Drives a personal status display; not a leaderboard.

import { Feather } from "@expo/vector-icons";

export const REVIEWS_PER_STEP = 20;
export const STEPS_PER_RANK = 5;
export const REVIEWS_PER_RANK = REVIEWS_PER_STEP * STEPS_PER_RANK; // 100
export const TOTAL_TIERS = 50; // 10 ranks × 5 steps
export const BOSS_RANK_INDEX = 9;
export const PRE_BOSS_TIERS = BOSS_RANK_INDEX * STEPS_PER_RANK; // 45
export const PRE_BOSS_REVIEWS = PRE_BOSS_TIERS * REVIEWS_PER_STEP; // 900
export const BOSS_ENTRY_REVIEWS = 1000;
export const PROMOTION_GAP = BOSS_ENTRY_REVIEWS - PRE_BOSS_REVIEWS; // 100
export const MAX_REVIEWS = BOSS_ENTRY_REVIEWS + STEPS_PER_RANK * REVIEWS_PER_STEP; // 1100

export type RankIconName = keyof typeof Feather.glyphMap;

export interface RankDef {
  name: string;
  color: string;
  gradient: [string, string];
  icon: RankIconName;
}

export const RANKS: RankDef[] = [
  { name: "Bronzestone",     color: "#CD7F32", gradient: ["#B97333", "#E0A574"], icon: "shield" },
  { name: "Silverstone",     color: "#A8B2C0", gradient: ["#8E97A6", "#D8DEE6"], icon: "shield" },
  { name: "Platinumstone",   color: "#14B8A6", gradient: ["#0F9A8C", "#5EEAD4"], icon: "shield" },
  { name: "Diamondstone",    color: "#06B6D4", gradient: ["#0284C7", "#67E8F9"], icon: "octagon" },
  { name: "Emeraldstone",    color: "#10B981", gradient: ["#047857", "#6EE7B7"], icon: "hexagon" },
  { name: "Hero",            color: "#F97316", gradient: ["#EA580C", "#FDBA74"], icon: "zap" },
  { name: "Master",          color: "#EF4444", gradient: ["#DC2626", "#FCA5A5"], icon: "award" },
  { name: "Ultimate Master", color: "#A855F7", gradient: ["#7E22CE", "#D8B4FE"], icon: "target" },
  { name: "God Master",      color: "#F59E0B", gradient: ["#D97706", "#FCD34D"], icon: "sun" },
  { name: "The Boss",        color: "#DC2626", gradient: ["#7F1D1D", "#FCA5A5"], icon: "star" },
];

export const STEP_ROMAN = ["I", "II", "III", "IV", "V"];

export interface RankInfo {
  rankIndex: number;        // 0-9
  rankName: string;
  step: number;             // 1-5
  stepRoman: string;        // I-V
  tierIndex: number;        // 0-49
  reviewsIntoStep: number;  // progress within the current step
  reviewsToNextStep: number; // remaining reviews to next step (or to Boss promotion at God Master V)
  stepWidth: number;        // total reviews this step covers (usually 20; God Master V = 120 due to Boss promotion gap)
  isMaxed: boolean;
  color: string;
  gradient: [string, string];
  icon: RankIconName;
  totalProgress: number;    // 0..1 to The Boss V
  totalReviews: number;     // capped at MAX_REVIEWS for display
  nextRankName?: string;
  nextStepLabel?: string;   // e.g. "Diamondstone IV" or "Silverstone I"
}

/** Total review count where a given tier (0-49) starts. */
function tierStartReviews(tierIndex: number): number {
  if (tierIndex < PRE_BOSS_TIERS) {
    return tierIndex * REVIEWS_PER_STEP;
  }
  return BOSS_ENTRY_REVIEWS + (tierIndex - PRE_BOSS_TIERS) * REVIEWS_PER_STEP;
}

/** How many reviews this tier covers (the God Master V tier is wider — it
 *  absorbs the 100-review promotion gap before The Boss I unlocks). */
function tierWidth(tierIndex: number): number {
  if (tierIndex < PRE_BOSS_TIERS - 1) return REVIEWS_PER_STEP;
  if (tierIndex === PRE_BOSS_TIERS - 1) return REVIEWS_PER_STEP + PROMOTION_GAP; // God Master V = 120
  return REVIEWS_PER_STEP;
}

/** Resolve a totalCompleted review count to its tier (0-49). */
function tierFromReviews(totalCompleted: number): number {
  const reviews = Math.max(0, Math.floor(totalCompleted));
  if (reviews >= MAX_REVIEWS) return TOTAL_TIERS - 1;
  if (reviews >= BOSS_ENTRY_REVIEWS) {
    const offset = reviews - BOSS_ENTRY_REVIEWS;
    return Math.min(PRE_BOSS_TIERS + Math.floor(offset / REVIEWS_PER_STEP), TOTAL_TIERS - 1);
  }
  if (reviews >= PRE_BOSS_REVIEWS) {
    // Inside the promotion gap (900-999): user is "on" God Master V (tier 44).
    return PRE_BOSS_TIERS - 1;
  }
  return Math.floor(reviews / REVIEWS_PER_STEP);
}

export function getRankInfo(totalCompleted: number): RankInfo {
  const reviews = Math.max(0, Math.floor(totalCompleted));
  const capped = Math.min(reviews, MAX_REVIEWS);
  const isMaxed = reviews >= MAX_REVIEWS;
  const tierIndex = tierFromReviews(capped);
  const rankIndex = Math.floor(tierIndex / STEPS_PER_RANK);
  const stepZero = tierIndex % STEPS_PER_RANK;
  const def = RANKS[rankIndex];

  const tierStart = tierStartReviews(tierIndex);
  const width = tierWidth(tierIndex);
  const reviewsIntoStep = isMaxed ? width : capped - tierStart;
  const reviewsToNextStep = isMaxed ? 0 : Math.max(0, width - reviewsIntoStep);

  // "Next step" only exists if we're not already on the final tier (The Boss V).
  let nextRankName: string | undefined;
  let nextStepLabel: string | undefined;
  if (tierIndex < TOTAL_TIERS - 1) {
    const nextTier = tierIndex + 1;
    const nextRankIdx = Math.floor(nextTier / STEPS_PER_RANK);
    const nextStepZero = nextTier % STEPS_PER_RANK;
    nextRankName = RANKS[nextRankIdx].name;
    nextStepLabel = `${RANKS[nextRankIdx].name} ${STEP_ROMAN[nextStepZero]}`;
  }

  return {
    rankIndex,
    rankName: def.name,
    step: stepZero + 1,
    stepRoman: STEP_ROMAN[stepZero],
    tierIndex,
    reviewsIntoStep,
    reviewsToNextStep,
    stepWidth: width,
    isMaxed,
    color: def.color,
    gradient: def.gradient,
    icon: def.icon,
    totalProgress: capped / MAX_REVIEWS,
    totalReviews: capped,
    nextRankName,
    nextStepLabel,
  };
}

/**
 * Tier index (0-49) for a given total completed reviews count.
 * Useful when comparing previous-vs-new tier without building a full RankInfo.
 */
export function getTierIndex(totalCompleted: number): number {
  return tierFromReviews(totalCompleted);
}

/** Roman label for a 0-indexed step (0..4). */
export function stepRoman(stepZero: number): string {
  return STEP_ROMAN[Math.max(0, Math.min(stepZero, STEP_ROMAN.length - 1))];
}

/** Total reviews needed to enter rank `rankIndex` at step I. */
export function rankEntryReviews(rankIndex: number): number {
  if (rankIndex >= BOSS_RANK_INDEX) return BOSS_ENTRY_REVIEWS;
  return rankIndex * REVIEWS_PER_RANK;
}

/** Total reviews at which the user is sitting on the final step (V) of `rankIndex`. */
export function rankMaxedReviews(rankIndex: number): number {
  if (rankIndex >= BOSS_RANK_INDEX) {
    return BOSS_ENTRY_REVIEWS + (STEPS_PER_RANK - 1) * REVIEWS_PER_STEP;
  }
  // Last step of pre-Boss ranks: e.g. God Master V starts at 880, but for
  // ranks before God Master we just want any value inside the V step.
  if (rankIndex === BOSS_RANK_INDEX - 1) {
    // God Master V — sits at 880-999 inclusive; pick start of step.
    return PRE_BOSS_REVIEWS - REVIEWS_PER_STEP;
  }
  return (rankIndex + 1) * REVIEWS_PER_RANK - 1;
}
