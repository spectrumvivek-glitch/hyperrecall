// Rank ladder — Free Fire-style competitive progression.
//
// 10 ranks × 5 steps × 20 reviews per step = 1000 reviews to reach The Boss V.
// Drives a personal status display; not a networked leaderboard.

import { Feather } from "@expo/vector-icons";

export const REVIEWS_PER_STEP = 20;
export const STEPS_PER_RANK = 5;
export const REVIEWS_PER_RANK = REVIEWS_PER_STEP * STEPS_PER_RANK; // 100
export const TOTAL_TIERS = 50; // 10 ranks × 5 steps
export const MAX_REVIEWS = TOTAL_TIERS * REVIEWS_PER_STEP; // 1000

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
  reviewsIntoStep: number;  // 0-10
  reviewsToNextStep: number; // 0-10
  isMaxed: boolean;
  color: string;
  gradient: [string, string];
  icon: RankIconName;
  totalProgress: number;    // 0..1 to The Boss V
  totalReviews: number;     // capped at MAX_REVIEWS for display
  nextRankName?: string;
  nextStepLabel?: string;   // e.g. "Diamondstone IV" or "Silverstone I"
}

export function getRankInfo(totalCompleted: number): RankInfo {
  const reviews = Math.max(0, Math.floor(totalCompleted));
  const capped = Math.min(reviews, MAX_REVIEWS);
  const isMaxed = reviews >= MAX_REVIEWS;
  const tierIndex = isMaxed
    ? TOTAL_TIERS - 1
    : Math.min(Math.floor(capped / REVIEWS_PER_STEP), TOTAL_TIERS - 1);
  const rankIndex = Math.floor(tierIndex / STEPS_PER_RANK);
  const stepZero = tierIndex % STEPS_PER_RANK;
  const def = RANKS[rankIndex];
  const reviewsIntoStep = isMaxed
    ? REVIEWS_PER_STEP
    : capped - tierIndex * REVIEWS_PER_STEP;
  const reviewsToNextStep = isMaxed ? 0 : REVIEWS_PER_STEP - reviewsIntoStep;

  // "Next step" only exists if we're not already on the final tier (The Boss V).
  // Note: a user at 490–499 reviews is on tier 49 (The Boss V) but not yet maxed
  // (maxed = 500). They keep filling the V bar but have no further step to
  // unlock, so nextRank* must stay undefined to avoid reading RANKS[10].
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
  const reviews = Math.max(0, Math.floor(totalCompleted));
  if (reviews >= MAX_REVIEWS) return TOTAL_TIERS - 1;
  return Math.min(Math.floor(reviews / REVIEWS_PER_STEP), TOTAL_TIERS - 1);
}

/** Roman label for a 0-indexed step (0..4). */
export function stepRoman(stepZero: number): string {
  return STEP_ROMAN[Math.max(0, Math.min(stepZero, STEP_ROMAN.length - 1))];
}
