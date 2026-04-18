import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export const FREE_MAX_CATEGORIES = 3;
export const FREE_MAX_NOTES_PER_CATEGORY = 10;

type Listener = (title: string, message: string) => void;
let activeListener: Listener | null = null;

export function showProGate(title: string, message: string) {
  if (activeListener) {
    activeListener(title, message);
  } else if (typeof console !== "undefined") {
    console.warn("[proGate] No host mounted. Pro gate dismissed silently:", title);
  }
}

const PRO_FEATURES: { icon: React.ComponentProps<typeof Feather>["name"]; label: string }[] = [
  { icon: "folder-plus", label: "Unlimited categories" },
  { icon: "edit-3", label: "Unlimited notes per category" },
  { icon: "award", label: "Full Exam Mode access" },
];

export function ProGateHost() {
  const colors = useColors();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler: Listener = (t, m) => {
      setTitle(t);
      setMessage(m);
      setVisible(true);
    };
    activeListener = handler;
    return () => {
      if (activeListener === handler) activeListener = null;
    };
  }, []);

  const close = () => setVisible(false);

  const upgrade = () => {
    setVisible(false);
    setTimeout(() => router.push("/paywall"), 50);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.background, borderRadius: colors.radius }]}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}
          >
            <Feather name="zap" size={28} color="#fff" />
          </LinearGradient>

          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>

          <View style={[styles.featureBox, { backgroundColor: colors.muted, borderRadius: colors.radius / 2 }]}>
            {PRO_FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Feather name="check-circle" size={14} color="#8B5CF6" />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{f.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={upgrade} activeOpacity={0.85} style={styles.upgradeBtn}>
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.upgradeBtnInner, { borderRadius: colors.radius / 2 }]}
            >
              <Feather name="zap" size={16} color="#fff" />
              <Text style={styles.upgradeBtnText}>Upgrade to HyperRecall Pro</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={close} activeOpacity={0.7} style={styles.cancelBtn}>
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Maybe later</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  featureBox: {
    width: "100%",
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: "500",
  },
  upgradeBtn: {
    width: "100%",
    overflow: "hidden",
    marginBottom: 8,
  },
  upgradeBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
