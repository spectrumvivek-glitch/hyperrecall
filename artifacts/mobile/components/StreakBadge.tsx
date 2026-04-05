import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  streak: number;
  size?: "sm" | "md" | "lg";
}

export function StreakBadge({ streak, size = "md" }: Props) {
  const colors = useColors();

  const config = {
    sm: { iconSize: 14, fontSize: 12, padding: 4 },
    md: { iconSize: 18, fontSize: 16, padding: 6 },
    lg: { iconSize: 24, fontSize: 22, padding: 8 },
  }[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: streak > 0 ? "#ff6b0015" : colors.muted,
          paddingHorizontal: config.padding + 4,
          paddingVertical: config.padding,
          borderRadius: colors.radius,
        },
      ]}
    >
      <MaterialCommunityIcons
        name="fire"
        size={config.iconSize}
        color={streak > 0 ? "#ff6b00" : colors.mutedForeground}
      />
      <Text
        style={[
          styles.text,
          {
            fontSize: config.fontSize,
            color: streak > 0 ? "#ff6b00" : colors.mutedForeground,
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
  },
  text: {
    fontFamily: "Inter_700Bold",
  },
});
