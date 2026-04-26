import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
import { FloatingXP } from "@/components/FloatingXP";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ReviewTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    dueNotes,
    isLoading,
    refresh,
    markSkipped,
    reviewSessionXp,
    reviewCompletionTick,
    reviewLastXp,
    clearReviewSessionXp,
  } = useApp();

  const [busyId, setBusyId] = useState<string | null>(null);

  // Brief XP toast that fires when the user returns to this tab after
  // finishing a focused review. We track the last completion tick we've
  // already shown so navigating away and back without a new completion
  // doesn't re-trigger the animation.
  const [showXpToast, setShowXpToast] = useState(false);
  const lastSeenTickRef = useRef(reviewCompletionTick);

  useFocusEffect(
    useCallback(() => {
      if (reviewCompletionTick > lastSeenTickRef.current) {
        lastSeenTickRef.current = reviewCompletionTick;
        setShowXpToast(true);
      }
    }, [reviewCompletionTick])
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleStart = (noteId: string) => {
    router.push({ pathname: "/revision", params: { noteId } });
  };

  const handleSkip = async (noteId: string) => {
    if (busyId) return;
    setBusyId(noteId);
    try {
      await markSkipped(noteId);
    } catch (err: any) {
      console.warn("[review] markSkipped failed:", err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* `key` forces a remount on each new completion so the animation
          restarts even when consecutive completions earn the same XP. */}
      <FloatingXP
        key={reviewCompletionTick}
        amount={reviewLastXp}
        visible={showXpToast}
        onHide={() => setShowXpToast(false)}
      />
      <ScrollView
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
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Review</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {dueNotes.length === 0
                ? "No notes due — nice work!"
                : `${dueNotes.length} note${dueNotes.length !== 1 ? "s" : ""} due today`}
            </Text>
          </View>
          {reviewSessionXp > 0 && (
            <View
              style={[
                styles.sessionBadge,
                { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" },
              ]}
            >
              <Feather name="zap" size={12} color={colors.primary} />
              <Text style={[styles.sessionBadgeText, { color: colors.primary }]}>
                +{reviewSessionXp} XP
              </Text>
              <TouchableOpacity
                onPress={clearReviewSessionXp}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.sessionBadgeClose}
                activeOpacity={0.6}
              >
                <Feather name="x" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Start full session button */}
        {dueNotes.length > 1 && (
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
              <View style={styles.sessionContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle}>Start Full Session</Text>
                  <Text style={styles.sessionSub}>
                    Focus mode • one note at a time • +{dueNotes.length * 10} XP
                  </Text>
                </View>
                <View style={styles.sessionIcon}>
                  <Feather name="play" size={20} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Due list */}
        {dueNotes.length > 0 && (
          <View style={styles.list}>
            {dueNotes.map(({ note, plan }) => {
              const isBusy = busyId === note.id;
              return (
                <View
                  key={note.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: "/note-detail", params: { id: note.id } })}
                    style={styles.cardTop}
                  >
                    <View style={[styles.dueDot, { backgroundColor: colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.cardTitle, { color: colors.foreground }]}
                        numberOfLines={2}
                      >
                        {note.title}
                      </Text>
                      {note.content ? (
                        <Text
                          style={[styles.cardContent, { color: colors.mutedForeground }]}
                          numberOfLines={2}
                        >
                          {note.content}
                        </Text>
                      ) : null}
                      <View style={styles.cardMeta}>
                        <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
                          <Feather name="repeat" size={10} color={colors.mutedForeground} />
                          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                            Step {(plan.currentStep ?? 0) + 1} / {plan.intervals?.length ?? 0}
                          </Text>
                        </View>
                        {note.images && note.images.length > 0 && (
                          <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
                            <Feather name="image" size={10} color={colors.mutedForeground} />
                            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                              {note.images.length}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>

                  <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      onPress={() => handleSkip(note.id)}
                      disabled={isBusy}
                      style={[styles.skipBtn, { borderColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Feather name="skip-forward" size={15} color={colors.mutedForeground} />
                      <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleStart(note.id)}
                      disabled={isBusy}
                      style={[
                        styles.startBtn,
                        { backgroundColor: isBusy ? colors.muted : colors.primary },
                      ]}
                      activeOpacity={0.85}
                    >
                      <Feather name="play" size={16} color="#fff" />
                      <Text style={styles.startBtnText}>Start</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {dueNotes.length === 0 && !isLoading && (
          <EmptyState
            icon="check-circle"
            title="All caught up!"
            description="You've reviewed everything due today. Come back tomorrow to keep your streak alive."
            actionLabel="Go to Notes"
            onAction={() => router.push("/(tabs)/notes")}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 2 },
  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  sessionBadgeText: { fontSize: 12, fontWeight: "700" },
  sessionBadgeClose: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sessionGradient: {},
  sessionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  sessionTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  sessionSub: { fontSize: 12, color: "#ffffffcc", marginTop: 2 },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff25",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 10,
  },
  dueDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardContent: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardMeta: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  metaText: { fontSize: 10, fontWeight: "600" },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  skipText: { fontSize: 13, fontWeight: "600" },
  startBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
