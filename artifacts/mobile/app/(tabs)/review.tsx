import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
          shadowColor: categoryColor,
        },
      ]}
    >
      <View style={[cardStyles.categoryBar, { backgroundColor: categoryColor }]} />
      <View style={cardStyles.cardInner}>
        <View style={cardStyles.top}>
          <View style={{ flex: 1, gap: 5 }}>
            <View style={cardStyles.meta}>
              <View style={[cardStyles.catDot, { backgroundColor: categoryColor }]} />
              <Text style={[cardStyles.catName, { color: colors.mutedForeground }]}>{categoryName}</Text>
              <View style={[cardStyles.stepBadge, { backgroundColor: colors.primary + "20" }]}>
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
          <TouchableOpacity onPress={onDone} activeOpacity={0.82} style={cardStyles.doneWrap}>
            <LinearGradient
              colors={["#22C55E", "#16A34A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cardStyles.doneBtn}
            >
              <Feather name="check" size={15} color="#fff" />
              <Text style={cardStyles.doneText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  categoryBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  top: { flexDirection: "row", gap: 10 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: "500" },
  stepBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stepText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  preview: { fontSize: 13, lineHeight: 19 },
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
  doneWrap: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
  },
  doneText: { fontSize: 14, fontWeight: "700", color: "#fff" },
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
    return { name: cat?.name ?? "General", color: cat?.color ?? "#6366F1" };
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
              {dueNotes.length} card{dueNotes.length !== 1 ? "s" : ""} to review
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
                  <Text style={styles.sessionBtnTitle}>
                    Start Full Session
                  </Text>
                  <Text style={styles.sessionBtnSub}>
                    Review all {dueNotes.length} cards one by one • earn {dueNotes.length * 10}+ XP
                  </Text>
                </View>
                <View style={styles.sessionIcon}>
                  <Feather name="play" size={20} color="#fff" />
                </View>
              </View>
            </LinearGradient>
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
  dividerLabel: { fontSize: 12, fontWeight: "500" },
  list: { gap: 12 },
});
