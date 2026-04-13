import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
      <View style={[styles.iconRing, { borderColor: colors.primary + "30", backgroundColor: colors.primary + "10" }]}>
        <View style={[styles.iconInner, { backgroundColor: colors.primary + "20" }]}>
          <Feather name={icon} size={30} color={colors.primary} />
        </View>
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.82} style={styles.actionWrap}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.action}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.actionText}>{actionLabel}</Text>
          </LinearGradient>
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
    gap: 20,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },
  actionWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  action: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
