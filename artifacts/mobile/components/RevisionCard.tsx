import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Note, RevisionPlan } from "@/lib/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const [expanded, setExpanded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    pulseCheck();
    onComplete();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
      {/* Header */}
      <View style={styles.header}>
        {category && (
          <View style={[styles.categoryBadge, { backgroundColor: category.color + "20", borderRadius: 20 }]}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <Text style={[styles.categoryText, { color: category.color }]}>{category.name}</Text>
          </View>
        )}
        <Text style={[styles.stepText, { color: colors.mutedForeground }]}>
          Step {step + 1}/{total}
        </Text>
      </View>

      {/* Progress */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${((step + 1) / total) * 100}%`, borderRadius: 2 }]} />
      </View>

      {/* Title */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={[styles.title, { color: colors.foreground }]}>{note.title}</Text>
      </Animated.View>

      {/* Images */}
      {note.images.length > 0 && (
        <View style={styles.imageSection}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 48));
              setImageIndex(idx);
            }}
            style={styles.imageScroll}
          >
            {note.images.map((img) => (
              <Image key={img.id} source={{ uri: img.uri }} style={[styles.image, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
            ))}
          </ScrollView>
          {note.images.length > 1 && (
            <View style={styles.imageDots}>
              {note.images.map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i === imageIndex ? colors.primary : colors.border, width: i === imageIndex ? 16 : 6 }]} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Content */}
      {note.content.length > 0 && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.contentSection}>
          <Text style={[styles.content, { color: colors.mutedForeground }]} numberOfLines={expanded ? undefined : 3}>
            {note.content}
          </Text>
          {note.content.length > 120 && (
            <View style={styles.expandRow}>
              <Text style={[styles.expandText, { color: colors.primary }]}>{expanded ? "Show less" : "Show more"}</Text>
              <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Next revision info */}
      {nextInterval !== undefined && (
        <View style={[styles.nextRevision, { backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.nextRevisionText, { color: colors.mutedForeground }]}>
            Next revision in{" "}
            <Text style={{ color: colors.foreground }}>
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
          style={[styles.skipBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
          activeOpacity={0.7}
        >
          <Feather name="skip-forward" size={18} color={colors.mutedForeground} />
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleComplete}
          style={[styles.completeBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          activeOpacity={0.7}
        >
          <Feather name="check" size={18} color={colors.primaryForeground} />
          <Text style={[styles.completeText, { color: colors.primaryForeground }]}>Completed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, marginHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  categoryBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryText: { fontSize: 11 },
  stepText: { fontSize: 12 },
  progressBar: { height: 4, borderRadius: 2 },
  progressFill: { height: 4 },
  title: { fontSize: 20, lineHeight: 28 },
  imageSection: { gap: 8 },
  imageScroll: { borderRadius: 8 },
  image: { width: SCREEN_WIDTH - 80, height: 200, backgroundColor: "#f1f5f9" },
  imageDots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  dot: { height: 6, borderRadius: 3 },
  contentSection: { gap: 4 },
  content: { fontSize: 14, lineHeight: 22 },
  expandRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  expandText: { fontSize: 13 },
  nextRevision: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10 },
  nextRevisionText: { fontSize: 12, flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  skipBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, paddingVertical: 13 },
  skipText: { fontSize: 15 },
  completeBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13 },
  completeText: { fontSize: 15 },
});
