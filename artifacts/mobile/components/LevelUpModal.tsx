import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface LevelUpModalProps {
  visible: boolean;
  newLevel: number;
  levelName: string;
  xpGained: number;
  onDismiss: () => void;
}

const LEVEL_EMOJIS = ["🌱", "🔍", "📖", "🎓", "💡", "🔮", "⚡", "🏆", "🌟", "🧠"];

export function LevelUpModal({ visible, newLevel, levelName, xpGained, onDismiss }: LevelUpModalProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      starAnim.setValue(0);
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]),
        Animated.spring(starAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
      ]).start();
    }
  }, [visible]);

  const emoji = LEVEL_EMOJIS[Math.min(newLevel - 1, LEVEL_EMOJIS.length - 1)];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary + "40",
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconWrap,
              {
                backgroundColor: colors.primary + "20",
                transform: [
                  {
                    scale: starAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.3, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Animated.View>

          <Text style={[styles.levelUpLabel, { color: colors.primary }]}>Level Up!</Text>
          <Text style={[styles.levelNum, { color: colors.foreground }]}>Level {newLevel}</Text>
          <Text style={[styles.levelName, { color: colors.mutedForeground }]}>{levelName}</Text>

          <View style={[styles.xpBadge, { backgroundColor: colors.warning + "20", borderColor: colors.warning + "50" }]}>
            <Feather name="zap" size={14} color={colors.warning} />
            <Text style={[styles.xpBadgeText, { color: colors.warning }]}>+{xpGained} XP earned</Text>
          </View>

          <Text style={[styles.motivate, { color: colors.mutedForeground }]}>
            Keep studying — the next level awaits!
          </Text>

          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.btn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Awesome! 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 2,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emoji: { fontSize: 40 },
  levelUpLabel: { fontSize: 14, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  levelNum: { fontSize: 36, fontWeight: "800" },
  levelName: { fontSize: 18, fontWeight: "600", marginTop: -4 },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  xpBadgeText: { fontSize: 14, fontWeight: "700" },
  motivate: { fontSize: 13, textAlign: "center", marginTop: 4 },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { fontSize: 16, fontWeight: "700" },
});
