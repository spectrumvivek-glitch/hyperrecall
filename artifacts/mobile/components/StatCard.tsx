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
          shadowColor: accent,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
        <Feather name={icon ?? "activity"} size={18} color={accent} />
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
    padding: 16,
    gap: 4,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  value: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
