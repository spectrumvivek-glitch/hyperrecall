import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface DailyProgressBarProps {
  completed: number;
  goal: number;
  label?: string;
  accentStart?: string;
  accentEnd?: string;
}

export function DailyProgressBar({
  completed,
  goal,
  label = "Daily Goal",
  accentStart = "#6366F1",
  accentEnd = "#8B5CF6",
}: DailyProgressBarProps) {
  const colors = useColors();
  const pct = goal > 0 ? Math.min(completed / goal, 1) : 0;
  const done = completed >= goal;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Feather
            name={done ? "check-circle" : "target"}
            size={14}
            color={done ? colors.success : colors.primary}
          />
          <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        </View>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: done ? colors.success : colors.foreground }]}>
            {completed}
          </Text>
          <Text style={[styles.countSep, { color: colors.mutedForeground }]}>/ {goal}</Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <LinearGradient
          colors={done ? ["#22C55E", "#16A34A"] : [accentStart, accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${Math.max(pct > 0 ? 4 : 0, Math.round(pct * 100))}%` }]}
        />
      </View>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        {done
          ? "Daily goal reached! Great work 🎉"
          : `${goal - completed} more to reach your daily goal`}
      </Text>
    </View>
  );
}

interface DeckProgressBarProps {
  notesWithPlans: number;
  totalNotes: number;
}

export function DeckProgressBar({ notesWithPlans, totalNotes }: DeckProgressBarProps) {
  const colors = useColors();
  const pct = totalNotes > 0 ? Math.min(notesWithPlans / totalNotes, 1) : 0;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Feather name="layers" size={14} color={colors.warning} />
          <Text style={[styles.label, { color: colors.foreground }]}>Deck Progress</Text>
        </View>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: colors.warning }]}>{notesWithPlans}</Text>
          <Text style={[styles.countSep, { color: colors.mutedForeground }]}>/ {totalNotes}</Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <LinearGradient
          colors={["#F59E0B", "#EF4444"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${Math.max(pct > 0 ? 4 : 0, Math.round(pct * 100))}%` }]}
        />
      </View>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        {notesWithPlans} of {totalNotes} note{totalNotes !== 1 ? "s" : ""} scheduled for review
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  count: {
    fontSize: 18,
    fontWeight: "800",
  },
  countSep: {
    fontSize: 13,
    fontWeight: "500",
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  sub: {
    fontSize: 12,
  },
});
