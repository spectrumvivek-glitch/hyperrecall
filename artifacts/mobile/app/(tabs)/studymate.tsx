import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  { icon: "book-open", text: "Generate summary of your notes from images and pdf's" },
  { icon: "edit-3", text: "Generate practice questions on any topic" },
  { icon: "zap", text: "Quick study tips and memory tricks" },
];

export default function StudyMateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 14, paddingBottom: bottomPad + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            StudyMate AI
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your AI study buddy
          </Text>
        </View>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, "#7C3AED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}
          >
            <Feather name="message-circle" size={28} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.heroText, { color: colors.foreground }]}>
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
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
            WHAT YOU CAN DO
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
                <Feather name={f.icon} size={15} color={colors.primary} />
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
            size={12}
            color={colors.mutedForeground}
            style={{ marginTop: 2 }}
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
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#7C3AED",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  heroText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
  },
  primaryBtnWrap: {
    borderRadius: 14,
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
    paddingVertical: 15,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
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
    fontSize: 11.5,
    lineHeight: 16,
  },
});
