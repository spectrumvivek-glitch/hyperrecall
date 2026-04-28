import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RankBadge } from "@/components/RankBadge";
import { useColors } from "@/hooks/useColors";
import {
  MAX_REVIEWS,
  RANKS,
  RankInfo,
  getRankInfo,
  rankEntryReviews,
  rankMaxedReviews,
} from "@/lib/ranks";

interface Props {
  rank: RankInfo;
  totalCompleted: number;
}

const WINDOW = 2;

export function RankLadder({ rank, totalCompleted }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const totalPct = Math.min(rank.totalProgress, 1);
  const reviewsForBar = Math.min(totalCompleted, MAX_REVIEWS);

  const visibleIndices = expanded
    ? RANKS.map((_, i) => i)
    : Array.from({ length: WINDOW * 2 + 1 }, (_, k) => rank.rankIndex - WINDOW + k)
        .filter((i) => i >= 0 && i < RANKS.length);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, shadowColor: rank.color },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTitle}>
          <Feather name="trending-up" size={16} color={rank.color} />
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
            To The Boss V
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
        {visibleIndices.map((idx) => {
          const def = RANKS[idx];
          const isCurrent = idx === rank.rankIndex;
          const isUnlocked = idx <= rank.rankIndex;
          const representativeReviews = isCurrent
            ? totalCompleted
            : isUnlocked
              ? rankMaxedReviews(idx)
              : rankEntryReviews(idx);
          const info = getRankInfo(representativeReviews);
          const stepLabel = isCurrent
            ? `${rank.stepRoman}`
            : isUnlocked
              ? "V"
              : "I";
          const reviewsForRank = rankEntryReviews(idx);

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
              <View style={{ flex: 1, gap: 1 }}>
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
                      size={11}
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
                    ? `Unlocked at ${reviewsForRank}`
                    : `${reviewsForRank} reviews to unlock`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
        style={[styles.toggleBtn, { borderColor: colors.border }]}
      >
        <Text style={[styles.toggleText, { color: colors.primary }]}>
          {expanded ? "Show fewer" : `Show all ${RANKS.length} ranks`}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { fontSize: 15, fontWeight: "700" },
  currentChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  currentChipText: { fontSize: 11, fontWeight: "700" },
  totalBlock: { gap: 6 },
  totalLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 11, fontWeight: "500" },
  totalCount: { fontSize: 12, fontWeight: "700" },
  totalTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  totalFill: { height: 8, borderRadius: 4 },
  list: { gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  rowName: { fontSize: 13, fontWeight: "700" },
  rowSub: { fontSize: 10, fontWeight: "500" },
  currentTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  currentTagText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: -2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
