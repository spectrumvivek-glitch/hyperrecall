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
const FIRE_GLOW = "#FF8A3D";
const STREAK_TEXT_COLOR = "#B8501A";

export function StreakBadge({ streak, size = "md", pulse: _pulse = false }: Props) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Continuous fire-icon glow — opacity-only, no size change.
  const glow = useRef(new Animated.Value(0)).current;

  const config = {
    sm: { iconSize: 14, fontSize: 13, padH: 8, padV: 4 },
    md: { iconSize: 20, fontSize: 18, padH: 10, padV: 6 },
    lg: { iconSize: 28, fontSize: 24, padH: 12, padV: 8 },
  }[size];

  const isActive = streak > 0;

  // Pop animation when streak changes (one-shot)
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

  // Continuous opacity glow loop — fire icon only, no scale change
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

  // Two stacked emoji layers behind the real one — they fade in/out
  // to create a halo around the 🔥 character. Same size, no scaling.
  const halo1Opacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
  const halo2Opacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] });

  const fireSize = config.iconSize;
  const fireLineHeight = fireSize + 4;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isActive ? STREAK_GLOW : colors.muted,
            borderColor: isActive ? STREAK_COLOR + "55" : colors.border,
            paddingHorizontal: config.padH,
            paddingVertical: config.padV,
            borderRadius: 20,
          },
        ]}
      >
        <View style={[styles.fireWrap, { width: fireSize, height: fireLineHeight }]}>
          {isActive && (
            <>
              <Animated.Text
                pointerEvents="none"
                style={[
                  styles.fireLayer,
                  {
                    fontSize: fireSize,
                    lineHeight: fireLineHeight,
                    opacity: halo1Opacity,
                    textShadowColor: FIRE_GLOW,
                    textShadowRadius: 14,
                    textShadowOffset: { width: 0, height: 0 },
                  },
                ]}
              >
                🔥
              </Animated.Text>
              <Animated.Text
                pointerEvents="none"
                style={[
                  styles.fireLayer,
                  {
                    fontSize: fireSize,
                    lineHeight: fireLineHeight,
                    opacity: halo2Opacity,
                    textShadowColor: FIRE_GLOW,
                    textShadowRadius: 22,
                    textShadowOffset: { width: 0, height: 0 },
                  },
                ]}
              >
                🔥
              </Animated.Text>
            </>
          )}
          <Text
            style={{
              fontSize: fireSize,
              lineHeight: fireLineHeight,
              textShadowColor: isActive ? FIRE_GLOW : "transparent",
              textShadowRadius: isActive ? 8 : 0,
              textShadowOffset: { width: 0, height: 0 },
            }}
          >
            🔥
          </Text>
        </View>
        <Text
          style={[
            styles.text,
            {
              fontSize: config.fontSize,
              color: isActive ? STREAK_TEXT_COLOR : colors.mutedForeground,
            },
          ]}
        >
          {streak}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  text: {
    fontWeight: "800",
  },
  fireWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  fireLayer: {
    position: "absolute",
    textAlign: "center",
  },
});
