import { Feather } from "@/components/Feather";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmbientGlow } from "@/components/AmbientGlow";
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
  prompt: string;
};

const FEATURES: FeatureItem[] = [
  {
    icon: "help-circle",
    title: "Ask any doubt",
    subtitle: "and get instant explanations",
    tint: "#A855F7",
    bg: "#F3E8FF",
    prompt: `I have a doubt in [SUBJECT] from the chapter [CHAPTER] on the topic [TOPIC].

My doubt/question:
[TYPE YOUR DOUBT HERE]

Explain it in a simple and clear way with step-by-step understanding, important concepts, formulas, examples, and easy tricks to remember.`,
  },
  {
    icon: "book-open",
    title: "Generate summary",
    subtitle: "of your notes from images",
    tint: "#3B82F6",
    bg: "#DBEAFE",
    prompt: `Generate a clear and concise summary of my notes from these images.

Summarize all important concepts, key points, formulas, definitions, and explanations in an easy-to-understand format. Keep it well-structured and useful for quick revision.`,
  },
  {
    icon: "video",
    title: "Summarize video lecture",
    subtitle: "to notes",
    tint: "#10B981",
    bg: "#D1FAE5",
    prompt: `Summarize this video lecture into short, clear, and well-structured notes.

Include:

* Important concepts
* Key explanations
* Formulas and definitions
* Important examples
* Shortcuts or tricks mentioned
* Main takeaways for quick revision

Make the notes easy to understand and organized point-wise.`,
  },
  {
    icon: "edit-3",
    title: "Generate practice questions",
    subtitle: "on any topic",
    tint: "#F59E0B",
    bg: "#FEF3C7",
    prompt: `Generate practice questions on the topic [TOPIC] for the exam [EXAM NAME].

Include:

* Concept-based questions
* Numerical/problem-solving questions
* Easy, medium, and hard difficulty levels
* Application-based questions
* Important formulas or concepts used

Make the questions exam-oriented, well-structured, and useful for practice and revision.`,
  },
  {
    icon: "zap",
    title: "Predict most likely questions",
    subtitle: "and topics for your exam",
    tint: "#8B5CF6",
    bg: "#EDE9FE",
    prompt: `Predict the most likely questions and important topics for the exam [EXAM NAME] from the chapter/topic [CHAPTER OR TOPIC].

Include:

* Most expected questions
* Frequently asked concepts
* Important formulas and derivations
* High-weightage topics
* Repeated question patterns
* Important theory and numericals

Make the prediction exam-focused, well-structured, and useful for last-minute preparation.`,
  },
];

// Animated floating mascot — gives the robot a premium, "alive" feel
function FloatingMascot() {
  const float = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle up-down float
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Twinkling sparkles (staggered)
    const twinkle = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 800, useNativeDriver: true }),
          Animated.delay(400),
        ]),
      ).start();

    twinkle(sparkle1, 0);
    twinkle(sparkle2, 600);
    twinkle(sparkle3, 1200);
  }, []);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const shadowScale = float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] });
  const shadowOpacity = float.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.18] });

  return (
    <View style={styles.mascotWrap}>
      {/* Soft purple gradient glow background */}
      <LinearGradient
        colors={["#EDE9FE", "#F5F3FF", "rgba(245,243,255,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.mascotGlow}
      />

      {/* Floating shadow underneath */}
      <Animated.View
        style={[
          styles.mascotShadow,
          { opacity: shadowOpacity, transform: [{ scaleX: shadowScale }] },
        ]}
      />

      {/* The robot itself — gentle float */}
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Image
          source={require("@/assets/images/studymate-robot.png")}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Twinkling sparkles around it */}
      <Animated.Text style={[styles.sparkleA, { opacity: sparkle1, transform: [{ scale: sparkle1 }] }]}>
        ✨
      </Animated.Text>
      <Animated.Text style={[styles.sparkleB, { opacity: sparkle2, transform: [{ scale: sparkle2 }] }]}>
        ⭐
      </Animated.Text>
      <Animated.Text style={[styles.sparkleC, { opacity: sparkle3, transform: [{ scale: sparkle3 }] }]}>
        ✨
      </Animated.Text>
    </View>
  );
}

export default function StudyMateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeFeature, setActiveFeature] = useState<FeatureItem | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!activeFeature) return;
    try {
      await Clipboard.setStringAsync(activeFeature.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.warn("[studymate] copy failed:", err);
      Alert.alert("Couldn't copy", "Please try again.");
    }
  };

  const closeModal = () => {
    setActiveFeature(null);
    setCopied(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AmbientGlow variant="studymate" />

      {/* Prompt preview modal */}
      <Modal
        visible={!!activeFeature}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {activeFeature && (
              <>
                <LinearGradient
                  colors={[activeFeature.bg, "transparent"]}
                  style={styles.modalAccent}
                />
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconWrap,
                      { backgroundColor: activeFeature.bg },
                    ]}
                  >
                    <Feather
                      name={activeFeature.icon}
                      size={22}
                      color={activeFeature.tint}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.modalTitle, { color: colors.foreground }]}
                    >
                      {activeFeature.title}
                    </Text>
                    <Text
                      style={[
                        styles.modalSubtitle,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {activeFeature.subtitle}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeModal}
                    style={[styles.modalClose, { backgroundColor: colors.muted }]}
                    hitSlop={8}
                  >
                    <Feather name="x" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.modalLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  PROMPT TEMPLATE
                </Text>
                <ScrollView
                  style={[
                    styles.modalPromptBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  showsVerticalScrollIndicator
                >
                  <Text
                    style={[styles.modalPromptText, { color: colors.foreground }]}
                    selectable
                  >
                    {activeFeature.prompt}
                  </Text>
                </ScrollView>

                <TouchableOpacity
                  onPress={handleCopy}
                  activeOpacity={0.85}
                  style={styles.modalCopyWrap}
                >
                  <LinearGradient
                    colors={
                      copied
                        ? ["#10B981", "#059669"]
                        : [activeFeature.tint, activeFeature.tint + "CC"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalCopyBtn}
                  >
                    <Feather
                      name={copied ? "check" : "copy"}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.modalCopyText}>
                      {copied ? "Copied!" : "Copy prompt"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
          <FloatingMascot />
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
            <TouchableOpacity
              key={f.title}
              activeOpacity={0.7}
              onPress={() => setActiveFeature(f)}
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
              <View
                style={[
                  styles.featureArrow,
                  { backgroundColor: f.bg },
                ]}
              >
                <Feather name="chevron-right" size={18} color={f.tint} />
              </View>
            </TouchableOpacity>
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
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mascotGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -5,
    left: -5,
  },
  mascotShadow: {
    position: "absolute",
    bottom: 6,
    width: 60,
    height: 8,
    borderRadius: 30,
    backgroundColor: "#7C3AED",
    ...Platform.select({
      ios: {
        shadowColor: "#7C3AED",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
      },
      android: { elevation: 0 },
    }),
  },
  mascotImage: {
    width: 100,
    height: 100,
    ...Platform.select({
      ios: {
        shadowColor: "#7C3AED",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  sparkleA: {
    position: "absolute",
    top: 4,
    left: -4,
    fontSize: 16,
  },
  sparkleB: {
    position: "absolute",
    top: 12,
    right: -6,
    fontSize: 13,
    color: "#FBBF24",
  },
  sparkleC: {
    position: "absolute",
    bottom: 18,
    left: -8,
    fontSize: 12,
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
  featureArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.25,
        shadowRadius: 28,
      },
      android: { elevation: 12 },
    }),
  },
  modalAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    opacity: 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 4,
  },
  modalPromptBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    maxHeight: 320,
  },
  modalPromptText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  modalCopyWrap: {
    marginTop: 4,
    borderRadius: 14,
    overflow: "hidden",
  },
  modalCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  modalCopyText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
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
