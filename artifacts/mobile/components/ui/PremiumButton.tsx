import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "gradient" | "solid" | "ghost" | "danger";
  disabled?: boolean;
  style?: ViewStyle;
  size?: "sm" | "md" | "lg";
}

export function PremiumButton({ label, onPress, variant = "gradient", disabled, style, size = "md" }: Props) {
  const colors = useColors();
  const padV = size === "sm" ? 10 : size === "lg" ? 16 : 13;

  if (variant === "gradient") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.82}
        style={[styles.btn, { opacity: disabled ? 0.5 : 1 }, style]}
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { paddingVertical: padV }]}
        >
          <Text style={styles.gradientText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === "danger") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[styles.btn, { backgroundColor: colors.destructive, paddingVertical: padV, paddingHorizontal: 20, opacity: disabled ? 0.5 : 1 }, style]}
      >
        <Text style={[styles.solidText, { color: colors.destructiveForeground }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  if (variant === "ghost") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[{ paddingVertical: padV, paddingHorizontal: 16, opacity: disabled ? 0.5 : 1 }, style]}
      >
        <Text style={[styles.solidText, { color: colors.primary }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.btn, { backgroundColor: colors.primary, paddingVertical: padV, paddingHorizontal: 20, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Text style={[styles.solidText, { color: "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  gradientText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  solidText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
