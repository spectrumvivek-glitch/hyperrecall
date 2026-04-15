import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

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

  const [trackWidth, setTrackWidth] = useState(0);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(1)).current;
  const prevDone = useRef(false);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (trackWidth <= 0) return;
    const targetWidth = Math.max(pct > 0 ? 8 : 0, pct * trackWidth);
    Animated.spring(fillAnim, {
      toValue: targetWidth,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
  }, [pct, trackWidth]);

  // Celebrate when goal is first reached
  useEffect(() => {
    if (done && !prevDone.current) {
      prevDone.current = true;
      Animated.sequence([
        Animated.spring(celebrateScale, { toValue: 1.06, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(celebrateScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      ]).start();
    } else if (!done) {
      prevDone.current = false;
    }
  }, [done]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        { backgroundColor: colors.card, borderColor: done ? colors.success + "50" : colors.border },
        { transform: [{ scale: celebrateScale }] },
      ]}
    >
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
      <View style={[styles.track, { backgroundColor: colors.muted }]} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fillWrap, { width: fillAnim }]}>
          <LinearGradient
            colors={done ? ["#22C55E", "#16A34A"] : [accentStart, accentEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text style={[styles.sub, { color: done ? colors.success : colors.mutedForeground }]}>
        {done
          ? "🎉 Daily goal reached! Great work!"
          : `${goal - completed} more to reach your daily goal`}
      </Text>
    </Animated.View>
  );
}

interface DeckProgressBarProps {
  notesWithPlans: number;
  totalNotes: number;
}

export function DeckProgressBar({ notesWithPlans, totalNotes }: DeckProgressBarProps) {
  const colors = useColors();
  const pct = totalNotes > 0 ? Math.min(notesWithPlans / totalNotes, 1) : 0;

  const [trackWidth, setTrackWidth] = useState(0);
  const fillAnim = useRef(new Animated.Value(0)).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (trackWidth <= 0) return;
    const targetWidth = Math.max(pct > 0 ? 8 : 0, pct * trackWidth);
    Animated.spring(fillAnim, {
      toValue: targetWidth,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
  }, [pct, trackWidth]);

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
      <View style={[styles.track, { backgroundColor: colors.muted }]} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fillWrap, { width: fillAnim }]}>
          <LinearGradient
            colors={["#F59E0B", "#EF4444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
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
  fillWrap: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  sub: {
    fontSize: 12,
  },
});
