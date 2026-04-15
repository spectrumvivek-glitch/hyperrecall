import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CelebrationPopup } from "@/components/CelebrationPopup";
import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Note, RevisionPlan } from "@/lib/storage";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/* ── Full-screen zoomable photo viewer ── */
function PhotoViewer({
  visible,
  images,
  startIndex,
  onClose,
}: {
  visible: boolean;
  images: { id: string; uri: string }[];
  startIndex: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(startIndex);

  // Reset page when opened
  React.useEffect(() => {
    if (visible) setActiveIdx(startIndex);
  }, [visible, startIndex]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={viewerStyles.overlay}>
        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={[viewerStyles.closeBtn, { top: insets.top + 12 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.8}
        >
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Counter */}
        {images.length > 1 && (
          <View style={[viewerStyles.counter, { top: insets.top + 16 }]}>
            <Text style={viewerStyles.counterText}>{activeIdx + 1} / {images.length}</Text>
          </View>
        )}

        {/* Swipeable gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setActiveIdx(idx);
          }}
          contentOffset={{ x: startIndex * SCREEN_W, y: 0 }}
          style={{ flex: 1 }}
        >
          {images.map((img) => (
            /* Each page is its own scroll view that handles pinch zoom */
            <ScrollView
              key={img.id}
              style={{ width: SCREEN_W, height: SCREEN_H }}
              contentContainerStyle={viewerStyles.zoomContainer}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
              bouncesZoom
            >
              <TouchableWithoutFeedback onPress={onClose}>
                <Image
                  source={{ uri: img.uri }}
                  style={{ width: SCREEN_W, height: SCREEN_H }}
                  resizeMode="contain"
                />
              </TouchableWithoutFeedback>
            </ScrollView>
          ))}
        </ScrollView>

        {/* Dot indicators */}
        {images.length > 1 && (
          <View style={[viewerStyles.dots, { bottom: insets.bottom + 24 }]}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[
                  viewerStyles.dot,
                  {
                    backgroundColor: i === activeIdx ? "#fff" : "#ffffff55",
                    width: i === activeIdx ? 20 : 7,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Hint */}
        <View style={[viewerStyles.hint, { bottom: insets.bottom + (images.length > 1 ? 56 : 28) }]}>
          <Text style={viewerStyles.hintText}>Pinch to zoom · tap to close</Text>
        </View>
      </View>
    </Modal>
  );
}

const viewerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 18,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff20",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
  },
  counterText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  zoomContainer: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: { height: 7, borderRadius: 4 },
  hint: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: { color: "#ffffff66", fontSize: 12 },
});

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
  onDone: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const colors = useColors();
  const [phase, setPhase] = useState<"preview" | "study">("preview");
  const [imgIndex, setImgIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);

  // Exit animation
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitTranslateY = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Expand animation (study phase)
  const expandAnim = useRef(new Animated.Value(0)).current;

  const openViewer = (idx: number) => { setViewerStart(idx); setViewerOpen(true); };

  const hasImages = note.images && note.images.length > 0;
  const intervalLabels = ["Day 1", "Day 3", "Day 7", "Day 14", "Day 30", "Day 60", "Day 90"];
  const stepLabel = intervalLabels[plan.currentStep] ?? `Step ${plan.currentStep + 1}`;

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
    animateAndComplete(() => onDone());
  };

  const flashBorder = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, "#22C55E80"],
  });

  const expandScale = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  const expandOpacity = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <>
    {hasImages && (
      <PhotoViewer
        visible={viewerOpen}
        images={note.images}
        startIndex={viewerStart}
        onClose={() => setViewerOpen(false)}
      />
    )}
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
            <View style={[cardStyles.stepBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[cardStyles.stepText, { color: colors.primary }]}>
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
                  {note.images.map((img, i) => (
                    <TouchableOpacity
                      key={img.id}
                      activeOpacity={0.92}
                      onPress={() => openViewer(i)}
                      style={{ position: "relative" }}
                    >
                      <Image
                        source={{ uri: img.uri }}
                        style={[cardStyles.image, { borderRadius: 10 }]}
                        resizeMode="contain"
                      />
                      {/* Zoom hint overlay */}
                      <View style={cardStyles.zoomHint}>
                        <Feather name="zoom-in" size={13} color="#fff" />
                        <Text style={cardStyles.zoomHintText}>Tap to zoom</Text>
                      </View>
                    </TouchableOpacity>
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
              colors={["#22C55E", "#16A34A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cardStyles.completeBtn}
            >
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={cardStyles.completeText}>Mark Complete</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
    </>
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
  zoomHint: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00000060",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoomHintText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  dot: { height: 6, borderRadius: 3 },
  photoHint: { fontSize: 11, textAlign: "center" },
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

  const handleDone = async (noteId: string) => {
    if (busy) return;
    setBusy(noteId);
    try {
      const earned = await markCompleted(noteId);
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
                  onDone={() => handleDone(note.id)}
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
