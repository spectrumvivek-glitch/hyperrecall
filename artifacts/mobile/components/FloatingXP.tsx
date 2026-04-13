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

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(0);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -30, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -60, duration: 300, useNativeDriver: true }),
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
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>+{amount} XP ⚡</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  text: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
