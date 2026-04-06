import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  accentColor?: string;
}

export function StatCard({ label, value, subtitle, icon, accentColor }: Props) {
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
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent + "18" }]}>
        <Feather name={icon ?? "activity"} size={16} color={accent} />
      </View>
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
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginTop: 1,
  },
});
