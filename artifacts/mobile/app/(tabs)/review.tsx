import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function DueCard({
  note,
  categoryName,
  categoryColor,
  step,
  onDone,
  onSkip,
}: {
  note: { id: string; title: string; content: string };
  categoryName: string;
  categoryColor: string;
  step: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const colors = useColors();
  const intervalLabels = ["Day 1", "Day 3", "Day 7", "Day 14", "Day 30", "Day 60", "Day 90"];
  const stepLabel = intervalLabels[step] ?? `Step ${step + 1}`;

  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderLeftColor: categoryColor,
        },
      ]}
    >
      <View style={cardStyles.top}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={cardStyles.meta}>
            <View style={[cardStyles.catDot, { backgroundColor: categoryColor }]} />
            <Text style={[cardStyles.catName, { color: colors.mutedForeground }]}>{categoryName}</Text>
            <View style={[cardStyles.stepBadge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[cardStyles.stepText, { color: colors.primary }]}>{stepLabel}</Text>
            </View>
          </View>
          <Text style={[cardStyles.title, { color: colors.foreground }]} numberOfLines={2}>
            {note.title}
          </Text>
          {note.content ? (
            <Text style={[cardStyles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
              {note.content}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={cardStyles.actions}>
        <TouchableOpacity
          onPress={onSkip}
          style={[cardStyles.skipBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Feather name="skip-forward" size={14} color={colors.mutedForeground} />
          <Text style={[cardStyles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDone}
          style={[cardStyles.doneBtn, { backgroundColor: colors.success }]}
          activeOpacity={0.8}
        >
          <Feather name="check" size={14} color="#fff" />
          <Text style={cardStyles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 12,
  },
  top: { flexDirection: "row", gap: 10 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stepBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  stepText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  preview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8 },
  skipBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  skipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  doneBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  doneText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

export default function ReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dueNotes, categories, revisionPlans, isLoading, refresh, markCompleted, markSkipped } = useApp();

  const [completing, setCompleting] = useState<string | null>(null);
  const [skipping, setSkipping] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const getCategoryInfo = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return { name: cat?.name ?? "General", color: cat?.color ?? "#4f46e5" };
  };

  const getPlanStep = (noteId: string) => {
    const plan = revisionPlans.find((p) => p.noteId === noteId);
    return plan?.currentStep ?? 0;
  };

  const handleDone = async (noteId: string) => {
    if (completing) return;
    setCompleting(noteId);
    try {
      await markCompleted(noteId);
    } finally {
      setCompleting(null);
    }
  };

  const handleSkip = async (noteId: string, title: string) => {
    if (skipping) return;
    if (Platform.OS === "web") {
      if (window.confirm(`Skip "${title}"? It'll stay due until you mark it done.`)) {
        setSkipping(noteId);
        await markSkipped(noteId);
        setSkipping(null);
      }
    } else {
      Alert.alert("Skip revision?", `"${title}" will stay due until you mark it done.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "default",
          onPress: async () => {
            setSkipping(noteId);
            await markSkipped(noteId);
            setSkipping(null);
          },
        },
      ]);
    }
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
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
              {dueNotes.length} card{dueNotes.length !== 1 ? "s" : ""} to review
            </Text>
          )}
        </View>
        {dueNotes.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.countBadgeText}>{dueNotes.length}</Text>
          </View>
        )}
      </View>

      {dueNotes.length > 0 && (
        <>
          {/* Start Full Session Button */}
          <TouchableOpacity
            onPress={() => router.push("/revision")}
            style={[styles.sessionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <View style={styles.sessionBtnContent}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sessionBtnTitle, { color: colors.primaryForeground }]}>
                  Start Full Session
                </Text>
                <Text style={[styles.sessionBtnSub, { color: colors.primaryForeground + "cc" }]}>
                  Review all {dueNotes.length} cards one by one • earn {dueNotes.length * 10}+ XP
                </Text>
              </View>
              <View style={[styles.sessionIcon, { backgroundColor: colors.primaryForeground + "20" }]}>
                <Feather name="play" size={20} color={colors.primaryForeground} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Divider with label */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerLabel, { color: colors.mutedForeground }]}>or mark individually</Text>
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
                  categoryName={name}
                  categoryColor={color}
                  step={plan.currentStep}
                  onDone={() => handleDone(note.id)}
                  onSkip={() => handleSkip(note.id, note.title)}
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
          description="No cards are due for review today. Great work keeping up with your schedule."
          actionLabel="Browse Notes"
          onAction={() => router.push("/notes")}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  countBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countBadgeText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  sessionBtn: { borderRadius: 16, overflow: "hidden" },
  sessionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  sessionBtnTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sessionBtnSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { gap: 10 },
});
