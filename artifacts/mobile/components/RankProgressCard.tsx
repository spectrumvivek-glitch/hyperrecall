import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RankBadge } from "@/components/RankBadge";
import { useColors } from "@/hooks/useColors";
import { RankInfo, REVIEWS_PER_STEP } from "@/lib/ranks";

interface Props {
  rank: RankInfo;
}

/**
 * Compact rank card for the Home tab — sits under the existing Level + XP card.
 *
 * Shows: rank emblem, rank name + step, "X / 10 to next step" progress bar,
 * and a small "Next: <next step name>" hint.
 */
export function RankProgressCard({ rank }: Props) {
  const colors = useColors();
  const pct = rank.isMaxed
    ? 1
    : Math.min(rank.reviewsIntoStep / REVIEWS_PER_STEP, 1);
  // At 490–499 reviews the user is on The Boss V (no next step) but not yet
  // maxed (500). Treat "no next step" the same as maxed for hint copy.
  const hasNext = !!rank.nextStepLabel;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: rank.color + "40",
          shadowColor: rank.color,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: rank.color + "10" }]} />

      <View style={styles.row}>
        <RankBadge rank={rank} size="md" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.label, { color: rank.color }]}>RANK</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {rank.rankName} {rank.stepRoman}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {rank.isMaxed
              ? "Maxed out — The Boss V"
              : hasNext
              ? `${rank.reviewsIntoStep} / ${REVIEWS_PER_STEP} to next step`
              : `${rank.reviewsIntoStep} / ${REVIEWS_PER_STEP} to maxed`}
          </Text>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <LinearGradient
          colors={rank.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.fill,
            { width: `${Math.max(3, Math.round(pct * 100))}%` },
          ]}
        />
      </View>

      {hasNext ? (
        <View style={styles.nextHintRow}>
          <Feather name="chevrons-up" size={12} color={colors.mutedForeground} />
          <Text style={[styles.nextHint, { color: colors.mutedForeground }]}>
            Next:{" "}
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              {rank.nextStepLabel}
            </Text>
          </Text>
        </View>
      ) : (
        <View style={styles.nextHintRow}>
          <Feather name="award" size={12} color={rank.color} />
          <Text style={[styles.nextHint, { color: rank.color }]}>
            {rank.isMaxed
              ? "You've reached the top of the ladder!"
              : "Final step — push to The Boss V max!"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
  },
  accent: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 140,
    height: 140,
    borderRadius: 70,
    transform: [{ translateX: 50 }, { translateY: -50 }],
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  name: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 12, fontWeight: "500" },
  track: { height: 9, borderRadius: 5, overflow: "hidden" },
  fill: { height: 9, borderRadius: 5 },
  nextHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  nextHint: { fontSize: 12, fontWeight: "500" },
});
