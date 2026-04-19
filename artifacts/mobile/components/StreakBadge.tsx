import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  streak: number;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const STREAK_COLOR = "#FF6B00";
const STREAK_GLOW = "#FF6B0030";

export function StreakBadge({ streak, size = "md", pulse: _pulse = false }: Props) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const config = {
    sm: { iconSize: 14, fontSize: 13, padH: 8, padV: 4 },
    md: { iconSize: 20, fontSize: 18, padH: 10, padV: 6 },
    lg: { iconSize: 28, fontSize: 24, padH: 12, padV: 8 },
  }[size];

  const isActive = streak > 0;

  // Pop animation when streak changes (one-shot, no infinite loop to avoid crashes)
  const prevStreak = useRef(streak);
  useEffect(() => {
    if (streak > 0 && streak !== prevStreak.current) {
      prevStreak.current = streak;
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      ]).start();
    }
  }, [streak]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isActive ? STREAK_GLOW : colors.muted,
            borderColor: isActive ? STREAK_COLOR + "50" : colors.border,
            paddingHorizontal: config.padH,
            paddingVertical: config.padV,
            borderRadius: 20,
          },
        ]}
      >
        <Text style={{ fontSize: config.iconSize, lineHeight: config.iconSize + 4 }}>🔥</Text>
        <Text
          style={[
            styles.text,
            {
              fontSize: config.fontSize,
              color: isActive ? STREAK_COLOR : colors.mutedForeground,
            },
          ]}
        >
          {streak}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  text: {
    fontWeight: "800",
  },
});
