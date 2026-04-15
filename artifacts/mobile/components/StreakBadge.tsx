import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  streak: number;
  size?: "sm" | "md" | "lg";
}

const STREAK_COLOR = "#FF6B00";
const STREAK_GLOW = "#FF6B0030";

export function StreakBadge({ streak, size = "md" }: Props) {
  const colors = useColors();

  const config = {
    sm: { iconSize: 14, fontSize: 13, padH: 8, padV: 4 },
    md: { iconSize: 20, fontSize: 18, padH: 10, padV: 6 },
    lg: { iconSize: 28, fontSize: 24, padH: 12, padV: 8 },
  }[size];

  const isActive = streak > 0;

  return (
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
