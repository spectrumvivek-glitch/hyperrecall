import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  streak: number;
  totalXp: number;
  levelName: string;
  onDismiss: () => void;
}

function streakMessage(streak: number): { headline: string; sub: string; emoji: string } {
  if (streak === 0)
    return {
      emoji: "✨",
      headline: "Welcome back!",
      sub: "Complete a revision today to start your streak.",
    };
  if (streak === 1)
    return {
      emoji: "🔥",
      headline: "Day 1 — Let's go!",
      sub: "One small step every day adds up fast.",
    };
  if (streak < 3)
    return {
      emoji: "🔥",
      headline: `${streak}-day streak!`,
      sub: "You're building a great habit. Keep showing up!",
    };
  if (streak < 7)
    return {
      emoji: "🔥",
      headline: `${streak}-day streak!`,
      sub: "Consistency is your superpower. Don't break it!",
    };
  if (streak < 14)
    return {
      emoji: "🔥",
      headline: `${streak}-day streak!`,
      sub: "A full week of learning. You're on fire!",
    };
  if (streak < 30)
    return {
      emoji: "🏆",
      headline: `${streak}-day streak!`,
      sub: "Two weeks strong. You're a learning machine!",
    };
  return {
    emoji: "💎",
    headline: `${streak}-day streak!`,
    sub: "Legendary dedication. The knowledge compounds!",
  };
}

export function DailyStreakPopup({ visible, streak, totalXp, levelName, onDismiss }: Props) {
  const colors = useColors();
  const { emoji, headline, sub } = streakMessage(streak);

  // Entry animation only — infinite loops removed to prevent Android crashes
  // (Animated.Text + useNativeDriver + infinite loop in a Modal is a known crash combo)
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.7);
      opacity.setValue(0);
      overlayOpacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  // Gradient colours based on streak level
  const gradientTop: [string, string] =
    streak >= 30
      ? ["#7C3AED", "#6366F1"]
      : streak >= 7
      ? ["#F59E0B", "#EF4444"]
      : streak >= 1
      ? ["#F97316", "#EF4444"]
      : ["#6366F1", "#8B5CF6"];

  const accentColor =
    streak >= 30 ? "#7C3AED" : streak >= 7 ? "#F59E0B" : streak >= 1 ? "#F97316" : "#6366F1";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Tapping the dark overlay dismisses */}
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View style={[styles.overlayBg, { opacity: overlayOpacity }]} />

        {/* Stop press bubbling through card */}
        <Pressable onPress={() => {}}>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                shadowColor: accentColor,
                transform: [{ scale }],
                opacity,
              },
            ]}
          >
            {/* Gradient top section */}
            <LinearGradient
              colors={gradientTop}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardTop}
            >
              {/* Glow blob (static) */}
              <View
                style={[styles.glowBlob, { backgroundColor: "#fff", opacity: 0.4 }]}
              />

              {/* Emoji (static, no infinite pulse) */}
              <Text style={styles.flameEmoji}>{emoji}</Text>

              {/* Streak number */}
              {streak > 0 && (
                <View style={styles.streakNumRow}>
                  <Text style={styles.streakNum}>{streak}</Text>
                  <Text style={styles.streakLabel}>{streak === 1 ? "Day" : "Days"}</Text>
                </View>
              )}
            </LinearGradient>

            {/* Body */}
            <View style={styles.body}>
              <Text style={[styles.headline, { color: colors.foreground }]}>{headline}</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>{sub}</Text>

              {/* Stat pills */}
              <View style={styles.pillsRow}>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" },
                  ]}
                >
                  <Feather name="zap" size={13} color={colors.primary} />
                  <Text style={[styles.pillText, { color: colors.primary }]}>
                    {totalXp.toLocaleString()} XP
                  </Text>
                </View>

                <View
                  style={[
                    styles.pill,
                    { backgroundColor: accentColor + "15", borderColor: accentColor + "30" },
                  ]}
                >
                  <Feather name="award" size={13} color={accentColor} />
                  <Text style={[styles.pillText, { color: accentColor }]}>{levelName}</Text>
                </View>
              </View>

              {/* Dismiss button */}
              <Pressable
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.dismissBtn,
                  { backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.dismissBtnText}>Let's Study! 🚀</Text>
              </Pressable>

              <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
                Tap anywhere to dismiss
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  card: {
    width: Platform.OS === "web" ? 360 : ("100%" as any),
    maxWidth: 360,
    borderRadius: 28,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  cardTop: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 36,
    paddingBottom: 28,
    gap: 8,
    overflow: "hidden",
  },
  glowBlob: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    alignSelf: "center",
  },
  flameEmoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  streakNumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  streakNum: {
    fontSize: 64,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 70,
    letterSpacing: -2,
  },
  streakLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  body: {
    padding: 24,
    gap: 12,
    alignItems: "center",
  },
  headline: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  dismissBtn: {
    marginTop: 6,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  dismissBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tapHint: {
    fontSize: 11,
    marginTop: 2,
  },
});
