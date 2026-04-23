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

import { CelebrationPopup } from "@/components/CelebrationPopup";
import { EmptyState } from "@/components/EmptyState";
import { FloatingXP } from "@/components/FloatingXP";
import { LevelUpModal } from "@/components/LevelUpModal";
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
    markCompleted,
    markSkipped,
    pendingLevelUp,
    dismissLevelUp,
  } = useApp();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [showXp, setShowXp] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [celebPopup, setCelebPopup] = useState<{ xp: number; title: string; total: number } | null>(null);
  const [sessionXp, setSessionXp] = useState(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleComplete = async (noteId: string, title: string) => {
    if (busyId) return;
    setBusyId(noteId);
    try {
      const earned = (await markCompleted(noteId)) ?? 0;
      const newTotal = sessionXp + earned;
      setSessionXp(newTotal);
      setXpAmount(earned);
      setShowXp(true);
      setCelebPopup({ xp: earned, title, total: newTotal });
    } catch (err: any) {
      console.warn("[review] markCompleted failed:", err);
      Alert.alert("Couldn't save", err?.message ?? "Please try again.");
    } finally {
      setBusyId(null);
    }
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
      <LevelUpModal
        visible={!!pendingLevelUp}
        newLevel={pendingLevelUp?.newLevel ?? 1}
        levelName={pendingLevelUp?.levelName ?? ""}
        xpGained={pendingLevelUp?.xpGained ?? 0}
        onDismiss={dismissLevelUp}
      />
      <CelebrationPopup
        visible={!!celebPopup}
        xpEarned={celebPopup?.xp ?? 0}
        noteTitle={celebPopup?.title ?? ""}
        totalSessionXp={celebPopup?.total ?? 0}
        onDismiss={() => setCelebPopup(null)}
        autoDismissMs={1400}
      />
      <FloatingXP amount={xpAmount} visible={showXp} onHide={() => setShowXp(false)} />

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
          {sessionXp > 0 && (
            <View style={[styles.xpPill, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
              <Feather name="zap" size={13} color={colors.primary} />
              <Text style={[styles.xpPillText, { color: colors.primary }]}>+{sessionXp} XP</Text>
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
                            Step {plan.completedSteps?.length ?? 0} / {plan.intervals?.length ?? 0}
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
                      onPress={() => handleComplete(note.id, note.title)}
                      disabled={isBusy}
                      style={[
                        styles.doneBtn,
                        { backgroundColor: isBusy ? colors.muted : colors.success },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.doneText}>
                        {isBusy ? "Saving…" : "Mark Complete"}
                      </Text>
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
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  xpPillText: { fontSize: 13, fontWeight: "700" },
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
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  doneText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
