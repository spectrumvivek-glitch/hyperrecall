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
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.primary + "15",
            borderRadius: colors.radius * 2,
          },
        ]}
      >
        <Feather name={icon} size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[
            styles.action,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>
            {actionLabel}
          </Text>
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
    padding: 32,
    gap: 12,
  },
  iconContainer: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  action: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
