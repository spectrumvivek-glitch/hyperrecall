import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
}

export function StatCard({ label, value, subtitle, accentColor }: Props) {
  const colors = useColors();
  const accent = accentColor || colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          borderWidth: 1,
          borderTopColor: accent,
          borderTopWidth: 3,
        },
      ]}
    >
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: accent }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    gap: 3,
  },
  value: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
