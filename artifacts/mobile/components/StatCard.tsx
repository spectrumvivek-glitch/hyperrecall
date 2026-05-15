import { Feather } from "@/components/Feather";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  accentColor?: string;
  /** When true, shows a small pulsing red notification dot on the icon. */
  pulse?: boolean;
  /** When true, fills the icon wrap with a gradient (uses accentColor). */
  gradientIcon?: boolean;
}

function lighten(hex: string, amount: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${mix(r).toString(16).padStart(2, "0")}${mix(g)
    .toString(16)
    .padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  accentColor,
  pulse,
  gradientIcon,
}: Props) {
  const colors = useColors();
  const accent = accentColor || colors.primary;
  const accentLight = lighten(accent, 0.35);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseAnim]);

  const ringScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

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
      <View style={styles.iconRow}>
        {gradientIcon ? (
          <LinearGradient
            colors={[accentLight, accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.iconWrap,
              {
                shadowColor: accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
          >
            <Feather name={icon ?? "activity"} size={20} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
            <Feather name={icon ?? "activity"} size={18} color={accent} />
          </View>
        )}

        {pulse && (
          <View style={styles.pulseAnchor} pointerEvents="none">
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  backgroundColor: "#EF4444",
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <View style={styles.pulseDot} />
          </View>
        )}
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 9,
  },
  iconRow: {
    position: "relative",
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseAnchor: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#fff",
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
