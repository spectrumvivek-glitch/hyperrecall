import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  pct: number;
  todayCompleted: number;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function ImprovementPopup({
  visible,
  pct,
  todayCompleted,
  onDismiss,
  autoDismissMs = 3500,
}: Props) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const positive = pct > 0;
  const neutral = pct === 0;

  const accentColor = positive ? colors.success : neutral ? colors.primary : colors.warning;
  const icon = positive ? "trending-up" : neutral ? "minus" : "trending-down";
  const emoji = positive ? "🚀" : neutral ? "💪" : "📈";

  const headline = positive
    ? `Up ${pct}% from yesterday!`
    : neutral
    ? "Same pace as yesterday"
    : `${Math.abs(pct)}% below yesterday`;

  const sub = positive
    ? `You completed ${todayCompleted} review${todayCompleted !== 1 ? "s" : ""} today — well done!`
    : neutral
    ? `${todayCompleted} review${todayCompleted !== 1 ? "s" : ""} done — consistent effort pays off!`
    : `You've done ${todayCompleted} review${todayCompleted !== 1 ? "s" : ""} — push a little harder!`;

  useEffect(() => {
    if (visible) {
      translateY.setValue(120);
      opacity.setValue(0);
      scale.setValue(0.9);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 70, friction: 9 }),
      ]).start();

      timer.current = setTimeout(() => dismiss(), autoDismissMs);
    } else {
      if (timer.current) clearTimeout(timer.current);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={dismiss}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: accentColor + "50",
            shadowColor: accentColor,
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={[styles.iconWrap, { backgroundColor: accentColor + "18" }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>

        <View style={styles.textBlock}>
          <View style={styles.headlineRow}>
            <Feather name={icon} size={14} color={accentColor} />
            <Text style={[styles.headline, { color: accentColor }]}>{headline}</Text>
          </View>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{sub}</Text>
        </View>

        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 110,
    left: 18,
    right: 18,
    zIndex: 200,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginRight: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 22 },
  textBlock: { flex: 1, gap: 2 },
  headlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  headline: { fontSize: 14, fontWeight: "700" },
  sub: { fontSize: 12, lineHeight: 17 },
});
