import { Feather } from "@/components/Feather";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ZoomableImageViewer } from "@/components/ZoomableImageViewer";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Note, RevisionPlan } from "@/lib/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = 240;

interface Props {
  note: Note;
  plan: RevisionPlan;
  onComplete: () => void;
  onSkip: () => void;
  isLast?: boolean;
}

export function RevisionCard({ note, plan, onComplete, onSkip }: Props) {
  const colors = useColors();
  const { categories } = useApp();
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  // Measured width of the image carousel slot. Falls back to a sensible
  // default for the very first frame before onLayout fires.
  const [slideWidth, setSlideWidth] = useState<number>(SCREEN_WIDTH - 64);
  const flatListRef = useRef<FlatList>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const category = categories.find((c) => c.id === note.categoryId);

  const step = plan.currentStep;
  const total = plan.intervals.length;
  const nextInterval = plan.intervals[Math.min(step + 1, total - 1)];

  const pulseCheck = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.12, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    pulseCheck();
    onComplete();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSkip();
  };

  const onCarouselLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && Math.abs(w - slideWidth) > 1) {
      setSlideWidth(w);
    }
  };

  const onCarouselScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth <= 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    const clamped = Math.max(0, Math.min(note.images.length - 1, idx));
    if (clamped !== imageIndex) {
      setImageIndex(clamped);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const goToImage = (idx: number) => {
    const clamped = Math.max(0, Math.min(note.images.length - 1, idx));
    flatListRef.current?.scrollToOffset({
      offset: clamped * slideWidth,
      animated: true,
    });
    setImageIndex(clamped);
    Haptics.selectionAsync().catch(() => {});
  };

  const hasMultipleImages = note.images.length > 1;
  const canGoPrev = hasMultipleImages && imageIndex > 0;
  const canGoNext = hasMultipleImages && imageIndex < note.images.length - 1;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius + 4,
          borderColor: colors.border,
          borderWidth: 1,
          shadowColor: colors.foreground,
        },
      ]}
    >
      <ZoomableImageViewer
        visible={viewerOpen}
        images={note.images}
        initialIndex={viewerStartIndex}
        onClose={() => setViewerOpen(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        {category ? (
          <View style={[styles.categoryBadge, { backgroundColor: category.color + "20" }]}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <Text style={[styles.categoryText, { color: category.color }]} numberOfLines={1}>
              {category.name}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <View style={[styles.stepPill, { backgroundColor: colors.muted }]}>
          <Feather name="layers" size={11} color={colors.mutedForeground} />
          <Text style={[styles.stepText, { color: colors.mutedForeground }]}>
            Step {step + 1}/{total}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${((step + 1) / total) * 100}%`,
              borderRadius: 3,
            },
          ]}
        />
      </View>

      {/* Title */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={[styles.title, { color: colors.foreground }]}>{note.title}</Text>
      </Animated.View>

      {/* Images carousel */}
      {note.images.length > 0 && (
        <View style={styles.imageSection} onLayout={onCarouselLayout}>
          <View
            style={[
              styles.imageFrame,
              {
                borderRadius: colors.radius,
                borderColor: colors.border,
                backgroundColor: colors.muted,
              },
            ]}
          >
            <FlatList
              ref={flatListRef}
              data={note.images}
              keyExtractor={(img) => img.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onCarouselScrollEnd}
              snapToInterval={slideWidth}
              snapToAlignment="start"
              decelerationRate="fast"
              getItemLayout={(_, index) => ({
                length: slideWidth,
                offset: slideWidth * index,
                index,
              })}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => {
                    setViewerStartIndex(index);
                    setViewerOpen(true);
                  }}
                  style={{ width: slideWidth, height: IMAGE_HEIGHT }}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  {/* Soft bottom gradient so the counter stays readable on
                      bright photos. */}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.45)"]}
                    style={styles.imageOverlay}
                    pointerEvents="none"
                  />
                </TouchableOpacity>
              )}
            />

            {/* Counter pill (always shown when there are images) */}
            <View style={styles.counterPill} pointerEvents="none">
              <Feather name="image" size={11} color="#fff" />
              <Text style={styles.counterText}>
                {imageIndex + 1} / {note.images.length}
              </Text>
            </View>

            {/* Tap-to-zoom hint (top-left) */}
            <View style={styles.zoomPill} pointerEvents="none">
              <Feather name="maximize-2" size={11} color="#fff" />
            </View>

            {/* Left / right chevron buttons — visible only when there are
                more images on that side. They give a discoverable hint that
                the carousel is swipeable, without blocking the gesture. */}
            {canGoPrev && (
              <TouchableOpacity
                onPress={() => goToImage(imageIndex - 1)}
                activeOpacity={0.7}
                style={[styles.chevronBtn, styles.chevronLeft]}
                hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
              >
                <Feather name="chevron-left" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {canGoNext && (
              <TouchableOpacity
                onPress={() => goToImage(imageIndex + 1)}
                activeOpacity={0.7}
                style={[styles.chevronBtn, styles.chevronRight]}
                hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
              >
                <Feather name="chevron-right" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Animated dots */}
          {hasMultipleImages && (
            <View style={styles.imageDots}>
              {note.images.map((_, i) => {
                const active = i === imageIndex;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => goToImage(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: active ? colors.primary : colors.border,
                          width: active ? 20 : 6,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Subtle swipe hint — only shown when there are multiple images */}
          {hasMultipleImages && (
            <View style={styles.swipeHint}>
              <Feather name="chevrons-left" size={11} color={colors.mutedForeground} />
              <Text style={[styles.swipeHintText, { color: colors.mutedForeground }]}>
                Swipe to see all images
              </Text>
              <Feather name="chevrons-right" size={11} color={colors.mutedForeground} />
            </View>
          )}
        </View>
      )}

      {/* Content lives in a dedicated NoteContentSection rendered below this
          card by revision.tsx — keeps this action card focused on title,
          images, and the complete/skip CTA. */}

      {/* Next revision info */}
      {nextInterval !== undefined && (
        <View
          style={[
            styles.nextRevision,
            { backgroundColor: colors.muted, borderRadius: colors.radius - 4 },
          ]}
        >
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.nextRevisionText, { color: colors.mutedForeground }]}>
            Next revision in{" "}
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              {nextInterval === 0 ? "today" : `${nextInterval} day${nextInterval !== 1 ? "s" : ""}`}
            </Text>{" "}
            if completed
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleSkip}
          style={[
            styles.skipBtn,
            { borderColor: colors.border, borderRadius: colors.radius },
          ]}
          activeOpacity={0.7}
        >
          <Feather name="skip-forward" size={18} color={colors.mutedForeground} />
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleComplete}
          activeOpacity={0.85}
          style={[styles.completeBtnWrap, { borderRadius: colors.radius, shadowColor: colors.primary }]}
        >
          <LinearGradient
            colors={["#10B981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.completeBtn, { borderRadius: colors.radius }]}
          >
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.completeText}>Completed</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Coaching tip — the heart of HyperRecall */}
      <View
        style={[
          styles.recallTip,
          {
            backgroundColor: colors.primary + "10",
            borderColor: colors.primary + "30",
            borderRadius: colors.radius - 2,
          },
        ]}
      >
        <View style={[styles.recallIconWrap, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="cpu" size={14} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.recallTitle, { color: colors.primary }]}>
            Here the HyperRecall starts
          </Text>
          <Text style={[styles.recallBody, { color: colors.foreground }]}>
            Try to recall without watching the notes — or teach that concept in your own words.
          </Text>
        </View>
      </View>
    </View>
  );
}

// Avoid unused-import warning when ScrollView is not used directly anywhere
// in the file — kept for backwards compat with anyone importing from here.
void ScrollView;
void Platform;

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: "70%",
  },
  categoryDot: { width: 7, height: 7, borderRadius: 4 },
  categoryText: { fontSize: 12, fontWeight: "700" },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: { fontSize: 11, fontWeight: "700" },
  progressBar: { height: 6, borderRadius: 3 },
  progressFill: { height: 6 },
  title: { fontSize: 22, fontWeight: "800", lineHeight: 30, letterSpacing: -0.3 },
  imageSection: { gap: 10 },
  imageFrame: {
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: IMAGE_HEIGHT,
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },
  counterPill: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  counterText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  zoomPill: {
    position: "absolute",
    left: 10,
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  chevronBtn: {
    position: "absolute",
    top: IMAGE_HEIGHT / 2 - 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  chevronLeft: { left: 8 },
  chevronRight: { right: 8 },
  imageDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 2,
  },
  dot: { height: 6, borderRadius: 3 },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 2,
  },
  swipeHintText: { fontSize: 11, fontWeight: "500" },
  contentSection: { gap: 4 },
  content: { fontSize: 15, lineHeight: 23 },
  expandRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  expandText: { fontSize: 13, fontWeight: "600" },
  nextRevision: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
  },
  nextRevisionText: { fontSize: 12, flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  skipBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    paddingVertical: 14,
  },
  skipText: { fontSize: 15, fontWeight: "600" },
  completeBtnWrap: {
    flex: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  completeText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  recallTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  recallIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  recallTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  recallBody: { fontSize: 13, lineHeight: 19, fontWeight: "500" },
});
