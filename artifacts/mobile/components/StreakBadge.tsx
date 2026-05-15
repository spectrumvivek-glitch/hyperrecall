import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  streak: number;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const STREAK_COLOR = "#FFA94D";
const STREAK_GLOW = "#FFA94D26";

export function StreakBadge({ streak, size = "md", pulse: _pulse = false }: Props) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Continuous "breathing" glow — runs forever while the streak is active.
  const glow = useRef(new Animated.Value(0)).current;

  const config = {
    sm: { iconSize: 14, fontSize: 13, padH: 8, padV: 4 },
    md: { iconSize: 20, fontSize: 18, padH: 10, padV: 6 },
    lg: { iconSize: 28, fontSize: 24, padH: 12, padV: 8 },
  }[size];

  const isActive = streak > 0;

  // Pop animation when streak changes (one-shot, no infinite loop to avoid crashes)
  const prevStreak = useRef(streak);
  useEffect(() => {
    if (streak > 0 && streak !== prevStreak.current) {
      prevStreak.current = streak;
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      ]).start();
    }
  }, [streak, scaleAnim]);

  // Continuous glow loop while the streak is active.
  useEffect(() => {
    if (!isActive) {
      glow.stopAnimation();
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, glow]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.55] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.04] });
  const ringScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={styles.glowWrap}>
        {isActive && (
          <>
            {/* Outer expanding ring — like a pulse wave */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                styles.ring,
                {
                  borderColor: STREAK_COLOR,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            {/* Inner soft halo — breathing */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                styles.halo,
                {
                  backgroundColor: STREAK_COLOR,
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            />
          </>
        )}
        <View
          style={[
            styles.container,
            {
              backgroundColor: isActive ? STREAK_GLOW : colors.muted,
              borderColor: isActive ? STREAK_COLOR + "55" : colors.border,
              paddingHorizontal: config.padH,
              paddingVertical: config.padV,
              borderRadius: 20,
              shadowColor: STREAK_COLOR,
              shadowOpacity: isActive ? 0.35 : 0,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
              elevation: isActive ? 6 : 0,
            },
          ]}
        >
          <Text style={{ fontSize: config.iconSize, lineHeight: config.iconSize + 4 }}>🔥</Text>
          <Text
            style={[
              styles.text,
              {
                fontSize: config.fontSize,
                color: isActive ? STREAK_COLOR : colors.mutedForeground,
              },
            ]}
          >
            {streak}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  text: {
    fontWeight: "800",
  },
  halo: {
    borderRadius: 24,
  },
  ring: {
    borderRadius: 24,
    borderWidth: 2,
  },
});
