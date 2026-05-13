import { Feather } from "@/components/Feather";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STUDYMATE_AI_URL =
  "https://chatgpt.com/g/g-69ee1c9314988191b54a52b0a1bc5a00-studymate-ai";

/**
 * Opens StudyMate AI in the user's browser / ChatGPT app.
 *
 * NOTE: We deliberately do NOT use `Linking.canOpenURL` here. On Android 11+
 * (API 30+) `canOpenURL` returns `false` for arbitrary https links unless
 * the app has declared the target in its `AndroidManifest` `queries` block.
 * That false negative is what caused the "unable to open link" message on
 * many phones — the link was perfectly openable, we just weren't allowed
 * to ask. Calling `openURL` directly works fine because the system itself
 * shows the chooser. We only fall back to a copy-to-clipboard path if
 * `openURL` itself throws (e.g. no browser installed at all).
 */
async function openStudyMateAI() {
  try {
    await Linking.openURL(STUDYMATE_AI_URL);
    return;
  } catch (err) {
    console.warn("[studymate] openURL failed:", err);
  }
  Alert.alert(
    "Couldn't open the link automatically",
    `Please open this link in your browser:\n\n${STUDYMATE_AI_URL}`,
    [
      { text: "OK", style: "cancel" },
      {
        text: "Share link",
        onPress: () => {
          Share.share({ message: STUDYMATE_AI_URL, url: STUDYMATE_AI_URL }).catch(
            () => {}
          );
        },
      },
    ]
  );
}

type FeatureItem = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  tint: string;
  bg: string;
};

const FEATURES: FeatureItem[] = [
  {
    icon: "help-circle",
    title: "Ask any doubt",
    subtitle: "and get instant explanations",
    tint: "#A855F7",
    bg: "#F3E8FF",
  },
  {
    icon: "book-open",
    title: "Generate summary",
    subtitle: "of your notes from images",
    tint: "#3B82F6",
    bg: "#DBEAFE",
  },
  {
    icon: "video",
    title: "Summarize video lecture",
    subtitle: "to notes",
    tint: "#10B981",
    bg: "#D1FAE5",
  },
  {
    icon: "edit-3",
    title: "Generate practice questions",
    subtitle: "on any topic",
    tint: "#F59E0B",
    bg: "#FEF3C7",
  },
  {
    icon: "zap",
    title: "Predict most likely questions",
    subtitle: "and topics for your exam",
    tint: "#8B5CF6",
    bg: "#EDE9FE",
  },
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
        {/* Header: Title + mascot */}
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              StudyMate{" "}
              <Text style={styles.titleAccent}>AI</Text>
            </Text>
          </View>
          <View style={styles.mascotWrap}>
            <Text style={styles.mascotEmoji}>🤖</Text>
            <Text style={styles.sparkleEmoji}>✨</Text>
          </View>
        </View>

        {/* Hero card */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <LinearGradient
            colors={["#7C3AED", "#6366F1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}
          >
            <Feather name="message-circle" size={28} color="#FFFFFF" />
            <Text style={styles.heroIconSparkle}>✨</Text>
          </LinearGradient>
          <View style={styles.heroTextWrap}>
            <Text style={[styles.heroText, { color: colors.foreground }]}>
              <Text style={styles.heroEmoji}>🧠 </Text>
              <Text style={styles.heroBold}>From doubts to exam success </Text>
              <Text>—instant answers, smart summaries, practice questions, and AI-powered predictions</Text>
            </Text>
            <View style={styles.heroUnderline} />
          </View>
        </View>

        {/* What you can do card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDash, { backgroundColor: "#A78BFA" }]} />
            <Text style={[styles.sectionTitle, { color: "#7C3AED" }]}>
              WHAT YOU CAN DO
            </Text>
            <View style={[styles.sectionDash, { backgroundColor: "#A78BFA" }]} />
          </View>

          {FEATURES.map((f, idx) => (
            <View
              key={f.title}
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
                  { backgroundColor: f.bg },
                ]}
              >
                <Feather name={f.icon} size={20} color={f.tint} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                  {f.title}
                </Text>
                <Text style={[styles.featureSubtitle, { color: colors.mutedForeground }]}>
                  {f.subtitle}
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={colors.mutedForeground}
              />
            </View>
          ))}

          {/* Tip row — separate styled section */}
          <View style={styles.tipWrap}>
            <View style={styles.tipRow}>
              <View style={styles.tipIconWrap}>
                <Feather name="copy" size={18} color="#F59E0B" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={[styles.tipTitle, { color: "#B45309" }]}>
                  Tip{" "}
                  <Text style={[styles.featureSubtitle, { color: colors.foreground }]}>
                    - Copy the summary and questions from StudyMate AI and paste it in your notes
                  </Text>
                </Text>
              </View>
              <Feather name="star" size={18} color="#F59E0B" />
            </View>
          </View>
        </View>

        {/* Big CTA */}
        <TouchableOpacity
          onPress={openStudyMateAI}
          activeOpacity={0.85}
          style={styles.primaryBtnWrap}
        >
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Feather name="external-link" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Open StudyMate AI</Text>
            <Text style={styles.primaryBtnSparkle}>✨</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleWrap: { flex: 1 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: "#7C3AED",
    fontWeight: "800",
  },
  mascotWrap: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mascotEmoji: {
    fontSize: 48,
  },
  sparkleEmoji: {
    position: "absolute",
    top: 4,
    right: 0,
    fontSize: 14,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#7C3AED",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  heroIconSparkle: {
    position: "absolute",
    bottom: 4,
    right: 4,
    fontSize: 11,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 19,
  },
  heroEmoji: {
    fontSize: 14,
  },
  heroBold: {
    fontWeight: "700",
  },
  heroUnderline: {
    height: 2,
    width: "55%",
    backgroundColor: "#A78BFA",
    borderRadius: 2,
    marginTop: 8,
    opacity: 0.6,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionDash: {
    width: 22,
    height: 2,
    borderRadius: 2,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  tipWrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 14,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderStyle: "dashed",
  },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  primaryBtnWrap: {
    borderRadius: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#7C3AED",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  primaryBtn: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryBtnSparkle: {
    fontSize: 14,
    marginLeft: 2,
  },
});
