import React from "react";

import { RankInfo } from "@/lib/ranks";

import { PremiumRankIcon } from "./PremiumRankIcon";

interface Props {
  rank: RankInfo;
  size?: "sm" | "md" | "lg";
  /** When false the badge is rendered in a dimmed/locked state. */
  unlocked?: boolean;
}

/**
 * Coloured rank emblem with the rank's Feather icon and the step roman numeral.
 * Now powered by `PremiumRankIcon` for a polished, multi-layered crest look.
 */
export function RankBadge({ rank, size = "md", unlocked = true }: Props) {
  return <PremiumRankIcon rank={rank} size={size} unlocked={unlocked} />;
}
