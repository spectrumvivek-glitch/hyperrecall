import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CelebrationPopup } from "@/components/CelebrationPopup";
import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Note, RevisionPlan } from "@/lib/storage";

const { width: SCREEN_W } = Dimensions.get("window");

const SM2_RATINGS = [
  { quality: 2, label: "Hard", icon: "frown" as const, color: "#EF4444", desc: "Barely remembered" },
  { quality: 4, label: "Good", icon: "meh" as const, color: "#F59E0B", desc: "Recalled with effort" },
  { quality: 5, label: "Easy", icon: "smile" as const, color: "#22C55E", desc: "Perfect recall!" },
];

function DueCard({
  note,
  plan,
  categoryName,
  categoryColor,
  onDone,
  onSkip,
  busy,
}: {
  note: Note;
  plan: RevisionPlan;
  categoryName: string;
  categoryColor: string;
  onDone: (quality?: number) => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const colors = useColors();
  const [phase, setPhase] = useState<"preview" | "study" | "rating">("preview");
  const [imgIndex, setImgIndex] = useState(0);

  // Exit animation
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitTranslateY = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Expand animation (study phase)
  const expandAnim = useRef(new Animated.Value(0)).current;

  const isSM2 = plan.mode === "sm2";
  const hasImages = note.images && note.images.length > 0;
  const intervalLabels = ["Day 1", "Day 3", "Day 7", "Day 14", "Day 30", "Day 60", "Day 90"];
  const stepLabel = isSM2
    ? `Rep ${plan.currentStep + 1}`
    : (intervalLabels[plan.currentStep] ?? `Step ${plan.currentStep + 1}`);

  const handleStart = () => {
    setPhase("study");
    Animated.spring(expandAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 70,
      friction: 9,
    }).start();
  };

  const animateAndComplete = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 0, duration: 80, useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(exitScale, { toValue: 0.88, duration: 220, useNativeDriver: true }),
        Animated.timing(exitOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(exitTranslateY, { toValue: -18, duration: 250, useNativeDriver: true }),
      ]),
    ]).start(() => callback());
  };

  const handleComplete = () => {
    if (isSM2) {
      setPhase("rating");
    } else {
      animateAndComplete(() => onDone());
    }
  };

  const handleRate = (quality: number) => {
    animateAndComplete(() => onDone(quality));
  };

  const flashBorder = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [phase === "rating" ? colors.warning + "50" : colors.border, "#22C55E80"],
  });

  const expandScale = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  const expandOpacity = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Animated.View
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: flashBorder,
          shadowColor: phase === "rating" ? colors.warning : categoryColor,
          opacity: exitOpacity,
          transform: [{ scale: exitScale }, { translateY: exitTranslateY }],
        },
      ]}
    >
      <View style={[cardStyles.categoryBar, { backgroundColor: categoryColor }]} />
      <View style={cardStyles.cardInner}>

        {/* ── Top meta row ── */}
        <View style={cardStyles.meta}>
          <View style={cardStyles.catRow}>
            <View style={[cardStyles.catDot, { backgroundColor: categoryColor }]} />
            <Text style={[cardStyles.catName, { color: colors.mutedForeground }]}>{categoryName}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {hasImages && phase === "preview" && (
              <View style={[cardStyles.photoBadge, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="image" size={10} color={colors.primary} />
                <Text style={[cardStyles.photoBadgeText, { color: colors.primary }]}>
                  {note.images.length} photo{note.images.length !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
            <View style={[
              cardStyles.stepBadge,
              { backgroundColor: isSM2 ? colors.warning + "20" : colors.primary + "20" },
            ]}>
              {isSM2 && <Feather name="zap" size={10} color={colors.warning} />}
              <Text style={[cardStyles.stepText, { color: isSM2 ? colors.warning : colors.primary }]}>
                {stepLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Note title ── */}
        <Text style={[cardStyles.title, { color: colors.foreground }]} numberOfLines={phase === "preview" ? 2 : undefined}>
          {note.title}
        </Text>

        {/* ── STUDY PHASE: images + content ── */}
        {phase !== "preview" && (
          <Animated.View style={{ opacity: expandOpacity, transform: [{ scale: expandScale }], gap: 12 }}>

            {/* Image gallery */}
            {hasImages && (
              <View style={cardStyles.imageSection}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 64));
                    setImgIndex(idx);
                  }}
                  style={cardStyles.imageScroll}
                >
                  {note.images.map((img) => (
                    <Image
                      key={img.id}
                      source={{ uri: img.uri }}
                      style={[cardStyles.image, { borderRadius: 10 }]}
                      resizeMode="contain"
                    />
                  ))}
                </ScrollView>
                {note.images.length > 1 && (
                  <View style={cardStyles.dots}>
                    {note.images.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          cardStyles.dot,
                          {
                            backgroundColor: i === imgIndex ? colors.primary : colors.border,
                            width: i === imgIndex ? 18 : 6,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
                <Text style={[cardStyles.photoHint, { color: colors.mutedForeground }]}>
                  {note.images.length > 1
                    ? `Photo ${imgIndex + 1} of ${note.images.length} · swipe to browse`
                    : "Your note photo"}
                </Text>
              </View>
            )}

            {/* Content text */}
            {note.content ? (
              <Text style={[cardStyles.content, { color: colors.foreground }]}>
                {note.content}
              </Text>
            ) : null}

            {/* SM-2 info row */}
            {isSM2 && phase === "study" && (
              <View style={[cardStyles.sm2Hint, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}>
                <Feather name="zap" size={12} color={colors.warning} />
                <Text style={[cardStyles.sm2HintText, { color: colors.warning }]}>
                  Smart mode — you'll rate your recall after completing
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── PREVIEW content snippet ── */}
        {phase === "preview" && note.content ? (
          <Text style={[cardStyles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
            {note.content}
          </Text>
        ) : null}

        {/* ── ACTION BUTTONS ── */}
        {phase === "preview" && (
          <View style={cardStyles.actions}>
            {/* Skip */}
            <TouchableOpacity
              onPress={onSkip}
              disabled={busy}
              style={[cardStyles.skipBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Feather name="skip-forward" size={14} color={colors.mutedForeground} />
              <Text style={[cardStyles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
            </TouchableOpacity>

            {/* Start */}
            <TouchableOpacity
              onPress={handleStart}
              disabled={busy}
              activeOpacity={0.82}
              style={cardStyles.startWrap}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={cardStyles.startBtn}
              >
                <Feather name="book-open" size={15} color="#fff" />
                <Text style={cardStyles.startText}>Start Review</Text>
                <Feather name="chevron-right" size={15} color="#ffffffcc" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {phase === "study" && (
          <TouchableOpacity
            onPress={handleComplete}
            disabled={busy}
            activeOpacity={0.82}
            style={cardStyles.completeWrap}
          >
            <LinearGradient
              colors={isSM2 ? ["#F59E0B", "#D97706"] : ["#22C55E", "#16A34A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cardStyles.completeBtn}
            >
              <Feather name={isSM2 ? "zap" : "check-circle"} size={16} color="#fff" />
              <Text style={cardStyles.completeText}>
                {isSM2 ? "Rate My Recall" : "Mark Complete"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {phase === "rating" && (
          <View style={cardStyles.ratingPanel}>
            <View style={cardStyles.ratingHeader}>
              <Feather name="zap" size={14} color={colors.warning} />
              <Text style={[cardStyles.ratingQuestion, { color: colors.foreground }]}>
                How well did you recall this?
              </Text>
            </View>
            <View style={cardStyles.ratingBtns}>
              {SM2_RATINGS.map((r) => (
                <TouchableOpacity
                  key={r.quality}
                  onPress={() => handleRate(r.quality)}
                  disabled={busy}
                  activeOpacity={0.75}
                  style={[cardStyles.ratingBtn, { borderColor: r.color + "60", backgroundColor: r.color + "12" }]}
                >
                  <Feather name={r.icon} size={20} color={r.color} />
                  <Text style={[cardStyles.ratingLabel, { color: r.color }]}>{r.label}</Text>
                  <Text style={[cardStyles.ratingDesc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setPhase("study")}
              style={cardStyles.cancelBtn}
              activeOpacity={0.7}
            >
              <Text style={[cardStyles.cancelText, { color: colors.mutedForeground }]}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
  categoryBar: { width: 4 },
  cardInner: { flex: 1, padding: 14, gap: 10 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: "500" },
  photoBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  photoBadgeText: { fontSize: 10, fontWeight: "600" },
  stepBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  preview: { fontSize: 13, lineHeight: 18 },
  content: { fontSize: 14, lineHeight: 22 },
  imageSection: { gap: 8 },
  imageScroll: { borderRadius: 10 },
  image: {
    width: SCREEN_W - 64,
    height: 220,
    backgroundColor: "#f1f5f9",
  },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  dot: { height: 6, borderRadius: 3 },
  photoHint: { fontSize: 11, textAlign: "center" },
  sm2Hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sm2HintText: { flex: 1, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 10 },
  skipBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  skipText: { fontSize: 14, fontWeight: "600" },
  startWrap: { flex: 2, borderRadius: 12, overflow: "hidden" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
  },
  startText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  completeWrap: { borderRadius: 12, overflow: "hidden" },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
  },
  completeText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  ratingPanel: { gap: 10 },
  ratingHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  ratingQuestion: { fontSize: 14, fontWeight: "600" },
  ratingBtns: { flexDirection: "row", gap: 8 },
  ratingBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  ratingLabel: { fontSize: 13, fontWeight: "700" },
  ratingDesc: { fontSize: 10, textAlign: "center" },
  cancelBtn: { alignItems: "center", paddingVertical: 4 },
  cancelText: { fontSize: 13 },
});

export default function ReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dueNotes, categories, isLoading, refresh, markCompleted, markSkipped } = useApp();

  const [busy, setBusy] = useState<string | null>(null);
  const [celebPopup, setCelebPopup] = useState<{ xp: number; title: string } | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const getCategoryInfo = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return { name: cat?.name ?? "General", color: cat?.color ?? "#6366F1" };
  };

  const handleDone = async (noteId: string, quality?: number) => {
    if (busy) return;
    setBusy(noteId);
    try {
      const earned = await markCompleted(noteId, quality);
      const noteTitle = dueNotes.find((n) => n.note.id === noteId)?.note.title ?? "";
      setCelebPopup({ xp: earned, title: noteTitle });
    } finally {
      setBusy(null);
    }
  };

  const handleSkip = async (noteId: string) => {
    if (busy) return;
    setBusy(noteId);
    try {
      await markSkipped(noteId);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
    <CelebrationPopup
      visible={!!celebPopup}
      xpEarned={celebPopup?.xp ?? 0}
      noteTitle={celebPopup?.title ?? ""}
      onDismiss={() => setCelebPopup(null)}
    />
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 20, paddingBottom: bottomPad + 110 },
      ]}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Due Today</Text>
          {dueNotes.length > 0 && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {dueNotes.length} note{dueNotes.length !== 1 ? "s" : ""} to review
            </Text>
          )}
        </View>
        {dueNotes.length > 0 && (
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.countBadge}
          >
            <Text style={styles.countBadgeText}>{dueNotes.length}</Text>
          </LinearGradient>
        )}
      </View>

      {dueNotes.length > 0 && (
        <>
          {/* Start Full Session Button */}
          <TouchableOpacity
            onPress={() => router.push("/revision")}
            activeOpacity={0.85}
            style={[styles.sessionBtn, { shadowColor: colors.primary }]}
          >
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sessionGradient}
            >
              <View style={styles.sessionBtnContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionBtnTitle}>Start Full Session</Text>
                  <Text style={styles.sessionBtnSub}>
                    Review all {dueNotes.length} notes one by one • earn {dueNotes.length * 10}+ XP
                  </Text>
                </View>
                <View style={styles.sessionIcon}>
                  <Feather name="play" size={20} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerLabel, { color: colors.mutedForeground }]}>or review individually</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          {/* Due Note Cards */}
          <View style={styles.list}>
            {dueNotes.map(({ note, plan }) => {
              const { name, color } = getCategoryInfo(note.categoryId);
              return (
                <DueCard
                  key={note.id}
                  note={note}
                  plan={plan}
                  categoryName={name}
                  categoryColor={color}
                  onDone={(quality) => handleDone(note.id, quality)}
                  onSkip={() => handleSkip(note.id)}
                  busy={busy === note.id}
                />
              );
            })}
          </View>
        </>
      )}

      {dueNotes.length === 0 && !isLoading && (
        <EmptyState
          icon="check-circle"
          title="All caught up!"
          description="No notes are due for review today. Great work keeping up with your schedule."
          actionLabel="Browse Notes"
          onAction={() => router.push("/notes")}
        />
      )}
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 3 },
  countBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  countBadgeText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sessionBtn: {
    borderRadius: 18,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  sessionGradient: {},
  sessionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  sessionBtnTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  sessionBtnSub: { fontSize: 13, color: "#ffffffbb", marginTop: 3 },
  sessionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff20",
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 12 },
  list: { gap: 14 },
});
