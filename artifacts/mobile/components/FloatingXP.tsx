import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  amount: number;
  visible: boolean;
  onHide: () => void;
}

export function FloatingXP({ amount, visible, onHide }: Props) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(0);
    opacity.setValue(0);
    scale.setValue(0.4);

    Animated.sequence([
      // Pop in with spring bounce
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 140,
          friction: 6,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(700),
      // Float up and fade out
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -80, duration: 350, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 350, useNativeDriver: true }),
      ]),
    ]).start(() => onHide());
  }, [visible, amount]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: colors.warning,
          opacity,
          transform: [{ translateY }, { scale }],
          shadowColor: colors.warning,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>⚡ +{amount} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    zIndex: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 12,
  },
  text: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
