import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Confetti } from "@/components/Confetti";
import { RankBadge } from "@/components/RankBadge";
import { useColors } from "@/hooks/useColors";
import { RankInfo } from "@/lib/ranks";

const { width: SW } = Dimensions.get("window");

interface Props {
  visible: boolean;
  rank: RankInfo;
  onDismiss: () => void;
}

/**
 * Big rank-up celebration overlay (full rank promotion — every 50 reviews).
 *
 * Rendered as an absolute-positioned overlay (NOT a Modal) so it can safely
 * coexist with the existing LevelUpModal without crashing the new architecture
 * on Android (see CelebrationPopup for the same approach).
 */
export function RankUpModal({ visible, rank, onDismiss }: Props) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      dismissingRef.current = false;
      scaleAnim.setValue(0.4);
      opacityAnim.setValue(0);
      overlayOpacity.setValue(0);
      badgeScale.setValue(0);

      Animated.sequence([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 90,
            friction: 7,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(badgeScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 6,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim, overlayOpacity, badgeScale]);

  const dismiss = () => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="auto">
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      <Confetti visible={visible} originX={SW / 2} originY={120} />
      <Pressable style={styles.touch} onPress={dismiss}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: rank.color + "55",
              shadowColor: rank.color,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={[rank.color + "25", rank.color + "00"]}
            style={styles.topAccent}
          />

          <Animated.View style={{ transform: [{ scale: badgeScale }] }}>
            <RankBadge rank={rank} size="lg" />
          </Animated.View>

          <Text style={[styles.eyebrow, { color: rank.color }]}>
            RANK PROMOTION
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome to {rank.rankName}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            You climbed all the way to{" "}
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              {rank.rankName} {rank.stepRoman}
            </Text>
            . The ladder bends to your effort — keep climbing!
          </Text>

          <LinearGradient
            colors={rank.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Feather name="trending-up" size={16} color="#fff" />
            <Text style={styles.ctaText}>
              {rank.nextStepLabel
                ? `Next: ${rank.nextStepLabel}`
                : rank.isMaxed
                ? "You've reached The Boss V — legendary!"
                : "Final step — push to The Boss V max!"}
            </Text>
          </LinearGradient>

          <Text style={[styles.tap, { color: colors.mutedForeground }]}>
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
    zIndex: 9000,
    elevation: 9000,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
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
    borderWidth: 2,
    padding: 28,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginTop: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    marginTop: 4,
  },
  ctaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tap: {
    fontSize: 11,
    marginTop: 4,
  },
});
