import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STUDYMATE_AI_URL =
  "https://chatgpt.com/g/g-69ee1c9314988191b54a52b0a1bc5a00-studymate-ai";

async function openStudyMateAI() {
  try {
    const supported = await Linking.canOpenURL(STUDYMATE_AI_URL);
    if (supported) {
      await Linking.openURL(STUDYMATE_AI_URL);
    } else {
      Alert.alert("StudyMate AI", "Couldn't open the link. Please try again.");
    }
  } catch {
    Alert.alert("StudyMate AI", "Couldn't open the link. Please try again.");
  }
}

const FEATURES: Array<{ icon: keyof typeof Feather.glyphMap; text: string }> = [
  { icon: "help-circle", text: "Ask any doubt and get instant explanations" },
  { icon: "book-open", text: "Concept clarification with simple examples" },
  { icon: "edit-3", text: "Generate practice questions on any topic" },
  { icon: "zap", text: "Quick study tips and memory tricks" },
];

export default function StudyMateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.topTitle, { color: colors.foreground }]}>
          StudyMate AI
        </Text>
        <TouchableOpacity
          accessibilityLabel="Open settings"
          onPress={() => router.push("/(tabs)/settings")}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
        >
          <Feather name="settings" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[colors.primary, "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}
          >
            <Feather name="message-circle" size={40} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Your AI study buddy
          </Text>
          <Text
            style={[styles.heroSubtitle, { color: colors.mutedForeground }]}
          >
            Stuck on a concept? Need a quick explanation? StudyMate AI is here
            to help — anytime, anywhere.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            What you can do
          </Text>
          {FEATURES.map((f, idx) => (
            <View
              key={f.text}
              style={[
                styles.featureRow,
                idx !== FEATURES.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.featureIconWrap,
                  { backgroundColor: colors.primary + "1A" },
                ]}
              >
                <Feather name={f.icon} size={16} color={colors.primary} />
              </View>
              <Text
                style={[styles.featureText, { color: colors.foreground }]}
              >
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={openStudyMateAI}
          activeOpacity={0.85}
          style={styles.primaryBtnWrap}
        >
          <LinearGradient
            colors={[colors.primary, "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Feather name="external-link" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Open StudyMate AI</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footerNote}>
          <Feather
            name="info"
            size={13}
            color={colors.mutedForeground}
            style={{ marginTop: 1 }}
          />
          <Text
            style={[styles.footerText, { color: colors.mutedForeground }]}
          >
            Powered by ChatGPT. Opens in your browser. A ChatGPT account may
            be required to chat with custom GPTs.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 24,
  },
  heroWrap: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#7C3AED",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  primaryBtnWrap: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#7C3AED",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
