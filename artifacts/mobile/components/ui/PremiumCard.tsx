import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;
  padding?: number;
  noPadding?: boolean;
}

export function PremiumCard({ children, style, glowColor, padding = 20, noPadding }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          shadowColor: glowColor ?? "#000",
          padding: noPadding ? 0 : padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden",
  },
});
