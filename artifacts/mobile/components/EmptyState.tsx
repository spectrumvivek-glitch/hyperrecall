import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconRing, { borderColor: colors.primary + "25", backgroundColor: colors.primary + "0d" }]}>
        <View style={[styles.iconInner, { backgroundColor: colors.primary + "18" }]}>
          <Feather name={icon} size={28} color={colors.primary} />
        </View>
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.action, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={15} color={colors.primaryForeground} />
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { alignItems: "center", gap: 6 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 260,
  },
  action: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  actionText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
