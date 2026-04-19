import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from "react-native";

const { width: SW } = Dimensions.get("window");

interface Props {
  visible: boolean;
  originX?: number;
  originY?: number;
  onDone?: () => void;
}

/**
 * Lightweight celebration animation.
 *
 * Replaces the previous 24-particle confetti (which used 24 × 4 = 96 Animated.Values
 * and was prone to crashing on low-end Android devices with the new architecture).
 *
 * Uses a single shared progress value to drive a burst of 6 static emoji that
 * scale + fade. Same API as before so callers don't need to change.
 */
export function Confetti({ visible, originX = SW / 2, originY = 200, onDone }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const running = useRef(false);

  useEffect(() => {
    if (!visible || running.current) return;
    running.current = true;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      running.current = false;
      if (finished) onDone?.();
    });
  }, [visible, progress, onDone]);

  if (!visible) return null;

  const scale = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.4, 1.2, 1],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -40],
  });

  const emojis = ["✨", "🎉", "⭐", "🎊", "✨", "⭐"];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={{
          position: "absolute",
          left: originX - 90,
          top: originY,
          width: 180,
          flexDirection: "row",
          justifyContent: "space-around",
          opacity,
          transform: [{ translateY }, { scale }],
        }}
      >
        {emojis.map((e, i) => (
          <Text key={i} style={{ fontSize: 22 + (i % 3) * 4 }}>
            {e}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}
