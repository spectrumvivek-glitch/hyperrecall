import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Confetti } from "@/components/Confetti";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  xpEarned: number;
  noteTitle: string;
  totalSessionXp?: number;
  onDismiss: () => void;
  autoDismissMs?: number;
}

/**
 * Celebration popup shown after a successful revision.
 *
 * Renders as an absolute-positioned overlay (NOT a <Modal>). Stacking two
 * native <Modal> components on Android with the new architecture (e.g. this
 * popup + LevelUpModal at the same time) crashes the app. An overlay View
 * avoids that entirely.
 */
export function CelebrationPopup({
  visible,
  xpEarned,
  noteTitle,
  totalSessionXp,
  onDismiss,
  autoDismissMs = 2200,
}: Props) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const xpScale = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      dismissingRef.current = false;
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      overlayOpacity.setValue(0);
      xpScale.setValue(0);

      Animated.sequence([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 110,
            friction: 7,
          }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]),
        Animated.spring(xpScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 180,
          friction: 6,
        }),
      ]).start();

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => dismiss(), autoDismissMs);
    } else {
      if (timer.current) clearTimeout(timer.current);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="auto">
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      <Confetti visible={visible} originY={120} />
      <Pressable
        style={styles.touch}
        onPress={dismiss}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.success + "50",
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={["#22C55E15", "#22C55E00"]}
            style={styles.topAccent}
          />

          <View style={[styles.iconRing, { backgroundColor: colors.success + "18", borderColor: colors.success + "35" }]}>
            <Text style={styles.emoji}>🎉</Text>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>Review Complete!</Text>
          <Text style={[styles.congratsText, { color: colors.mutedForeground }]}>
            Great job — keep building that habit!
          </Text>

          {noteTitle.length > 0 && (
            <View style={[styles.noteBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="file-text" size={12} color={colors.mutedForeground} />
              <Text style={[styles.noteTitleText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {noteTitle}
              </Text>
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: xpScale }] }}>
            <LinearGradient
              colors={["#F59E0B", "#EF4444"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.xpBadge}
            >
              <Text style={styles.xpBadgeText}>⚡ +{xpEarned} XP earned</Text>
            </LinearGradient>
          </Animated.View>

          {totalSessionXp !== undefined && totalSessionXp > xpEarned && (
            <Text style={[styles.sessionTotal, { color: colors.mutedForeground }]}>
              Session total: +{totalSessionXp} XP
            </Text>
          )}

          <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
            Tap anywhere to continue
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8000,
    elevation: 8000,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  touch: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 28,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  congratsText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  noteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: "100%",
  },
  noteTitleText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  xpBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  xpBadgeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sessionTotal: {
    fontSize: 12,
    fontWeight: "500",
  },
  tapHint: {
    fontSize: 11,
    marginTop: 4,
  },
});
