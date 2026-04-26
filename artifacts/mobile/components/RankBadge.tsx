import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RankInfo } from "@/lib/ranks";

interface Props {
  rank: RankInfo;
  size?: "sm" | "md" | "lg";
  /** When false the badge is rendered in a dimmed/locked state. */
  unlocked?: boolean;
}

/**
 * Coloured rank emblem with the rank's Feather icon and the step roman numeral.
 *
 * Uses a gradient circle with the icon inside and the step (I-V) as a small
 * ribbon along the bottom edge.
 */
export function RankBadge({ rank, size = "md", unlocked = true }: Props) {
  const cfg = {
    sm: { wrap: 36, icon: 16, ribbonH: 13, romanFs: 9, ribbonOffset: -3 },
    md: { wrap: 56, icon: 24, ribbonH: 18, romanFs: 11, ribbonOffset: -5 },
    lg: { wrap: 84, icon: 36, ribbonH: 24, romanFs: 14, ribbonOffset: -7 },
  }[size];

  const gradient: [string, string] = unlocked
    ? rank.gradient
    : ["#3F3F46", "#71717A"];

  return (
    <View
      style={[
        styles.shadow,
        {
          width: cfg.wrap,
          height: cfg.wrap + Math.abs(cfg.ribbonOffset) + 4,
          shadowColor: unlocked ? rank.color : "#000",
        },
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.circle,
          {
            width: cfg.wrap,
            height: cfg.wrap,
            borderRadius: cfg.wrap / 2,
            opacity: unlocked ? 1 : 0.45,
          },
        ]}
      >
        <Feather name={rank.icon} size={cfg.icon} color="#fff" />
      </LinearGradient>
      <View
        style={[
          styles.ribbon,
          {
            height: cfg.ribbonH,
            paddingHorizontal: cfg.ribbonH * 0.6,
            borderRadius: cfg.ribbonH / 2,
            backgroundColor: unlocked ? rank.color : "#52525B",
            bottom: cfg.ribbonOffset,
          },
        ]}
      >
        <Text style={[styles.roman, { fontSize: cfg.romanFs }]}>
          {rank.stepRoman}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff35",
  },
  ribbon: {
    position: "absolute",
    alignSelf: "center",
    minWidth: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff55",
  },
  roman: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
