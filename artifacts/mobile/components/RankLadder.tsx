import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RankBadge } from "@/components/RankBadge";
import { useColors } from "@/hooks/useColors";
import {
  MAX_REVIEWS,
  RANKS,
  RankInfo,
  REVIEWS_PER_RANK,
  getRankInfo,
} from "@/lib/ranks";

interface Props {
  rank: RankInfo;
  totalCompleted: number;
}

/**
 * Rich rank ladder for the Analytics tab.
 *
 * Lists all 10 ranks vertically with the user's current rank highlighted,
 * locked ranks dimmed, and an overall 0-500 progress bar to The Boss V at the
 * top.
 */
export function RankLadder({ rank, totalCompleted }: Props) {
  const colors = useColors();
  const totalPct = Math.min(rank.totalProgress, 1);
  const reviewsForBar = Math.min(totalCompleted, MAX_REVIEWS);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTitle}>
          <Feather name="trending-up" size={18} color={rank.color} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Rank Ladder
          </Text>
        </View>
        <View
          style={[styles.currentChip, { backgroundColor: rank.color + "1A" }]}
        >
          <Text style={[styles.currentChipText, { color: rank.color }]}>
            {rank.rankName} {rank.stepRoman}
          </Text>
        </View>
      </View>

      <View style={styles.totalBlock}>
        <View style={styles.totalLabelRow}>
          <Text
            style={[styles.totalLabel, { color: colors.mutedForeground }]}
          >
            Total progress to The Boss V
          </Text>
          <Text
            style={[
              styles.totalCount,
              { color: colors.foreground },
            ]}
          >
            {reviewsForBar} / {MAX_REVIEWS}
          </Text>
        </View>
        <View style={[styles.totalTrack, { backgroundColor: colors.muted }]}>
          <LinearGradient
            colors={rank.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.totalFill,
              { width: `${Math.max(2, Math.round(totalPct * 100))}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.list}>
        {RANKS.map((def, idx) => {
          const isCurrent = idx === rank.rankIndex;
          const isUnlocked = idx <= rank.rankIndex;
          // Build a representative RankInfo for this rank — show step V if
          // unlocked & past, current step if it's the user's rank, step I if
          // still locked.
          const representativeReviews = isCurrent
            ? totalCompleted
            : isUnlocked
              ? (idx + 1) * REVIEWS_PER_RANK - 1
              : idx * REVIEWS_PER_RANK;
          const info = getRankInfo(representativeReviews);
          const stepLabel = isCurrent
            ? `${rank.stepRoman}`
            : isUnlocked
              ? "V"
              : "I";
          const reviewsForRank = idx * REVIEWS_PER_RANK;

          return (
            <View
              key={def.name}
              style={[
                styles.row,
                {
                  backgroundColor: isCurrent
                    ? def.color + "12"
                    : "transparent",
                  borderColor: isCurrent ? def.color + "55" : colors.border,
                },
              ]}
            >
              <RankBadge rank={info} size="sm" unlocked={isUnlocked} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.rowTitleRow}>
                  <Text
                    style={[
                      styles.rowName,
                      {
                        color: isUnlocked
                          ? colors.foreground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {def.name}{" "}
                    <Text
                      style={{
                        color: isCurrent
                          ? def.color
                          : colors.mutedForeground,
                        fontWeight: "700",
                      }}
                    >
                      {stepLabel}
                    </Text>
                  </Text>
                  {isCurrent && (
                    <View
                      style={[
                        styles.currentTag,
                        { backgroundColor: def.color },
                      ]}
                    >
                      <Text style={styles.currentTagText}>YOU</Text>
                    </View>
                  )}
                  {!isUnlocked && (
                    <Feather
                      name="lock"
                      size={12}
                      color={colors.mutedForeground}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.rowSub,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {isUnlocked
                    ? `Unlocks at ${reviewsForRank} reviews`
                    : `Reach ${reviewsForRank} reviews to unlock`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 17, fontWeight: "700" },
  currentChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  currentChipText: { fontSize: 12, fontWeight: "700" },
  totalBlock: { gap: 7 },
  totalLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 12, fontWeight: "500" },
  totalCount: { fontSize: 13, fontWeight: "700" },
  totalTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  totalFill: { height: 10, borderRadius: 5 },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowName: { fontSize: 14, fontWeight: "700" },
  rowSub: { fontSize: 11, fontWeight: "500" },
  currentTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentTagText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
