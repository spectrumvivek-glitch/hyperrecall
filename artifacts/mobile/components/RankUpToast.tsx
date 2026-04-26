import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RankBadge } from "@/components/RankBadge";
import { RankInfo } from "@/lib/ranks";

interface Props {
  visible: boolean;
  rank: RankInfo;
  onDismiss: () => void;
  autoDismissMs?: number;
}

/**
 * Lightweight toast for STEP promotions (every 10 reviews).
 *
 * Slides in from the top, auto-dismisses, and can also be tapped to close.
 * Used instead of the bigger RankUpModal so the user isn't constantly
 * interrupted by full-screen celebrations during a review session.
 */
export function RankUpToast({
  visible,
  rank,
  onDismiss,
  autoDismissMs = 2400,
}: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-180)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      dismissingRef.current = false;
      translateY.setValue(-180);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => dismiss(), autoDismissMs);
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
      Animated.timing(translateY, {
        toValue: -180,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
        }}
      >
        <Pressable onPress={dismiss}>
          <LinearGradient
            colors={rank.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.toast, { shadowColor: rank.color }]}
          >
            <RankBadge rank={rank} size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>STEP UP</Text>
              <Text style={styles.title}>
                Promoted to {rank.rankName} {rank.stepRoman}!
              </Text>
            </View>
            <Feather name="trending-up" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 8500,
    elevation: 8500,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  eyebrow: {
    color: "#ffffffd0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
});
