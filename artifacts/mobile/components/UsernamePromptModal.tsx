import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useUserProfile } from "@/context/UserProfileContext";
import { useColors } from "@/hooks/useColors";

export function UsernamePromptModal() {
  const colors = useColors();
  const { isReady, hasUsername, setUsername } = useUserProfile();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const visible = isReady && !hasUsername;

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await setUsername(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Animated.View style={[styles.overlayBg, { opacity }]} />
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <Text style={styles.emoji}>👋</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome to HyperRecall!
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            What should we call you?
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            maxLength={30}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.muted,
                borderColor: colors.border,
              },
            ]}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={[
              styles.btn,
              {
                backgroundColor: canSubmit ? colors.primary : colors.muted,
              },
            ]}
          >
            <Text
              style={[
                styles.btnText,
                {
                  color: canSubmit ? colors.primaryForeground : colors.mutedForeground,
                },
              ]}
            >
              Get Started 🚀
            </Text>
          </TouchableOpacity>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            You can change this later in Settings
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  emoji: { fontSize: 56, lineHeight: 64 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: -4,
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  hint: {
    fontSize: 11,
    marginTop: 2,
  },
});
