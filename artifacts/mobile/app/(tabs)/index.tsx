import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
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
import { NoteCard } from "@/components/NoteCard";
import { StatCard } from "@/components/StatCard";
import { StreakBadge } from "@/components/StreakBadge";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dueNotes, userStats, notes, revisionPlans, isLoading, refresh } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const todayCompleted = dueNotes.filter((d) => d.plan.nextRevisionDate <= Date.now()).length;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good{new Date().getHours() < 12 ? " morning" : new Date().getHours() < 17 ? " afternoon" : " evening"}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            StudyBrain
          </Text>
        </View>
        <StreakBadge streak={userStats.currentStreak} size="md" />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Due Today"
          value={dueNotes.length}
          subtitle={dueNotes.length > 0 ? "Ready to review" : "All caught up!"}
          accentColor={dueNotes.length > 0 ? colors.primary : colors.success}
        />
        <StatCard
          label="Total Notes"
          value={notes.length}
          subtitle={`${revisionPlans.length} scheduled`}
          accentColor={colors.warning}
        />
        <StatCard
          label="Completed"
          value={userStats.totalCompleted}
          subtitle="All time"
          accentColor={colors.success}
        />
      </View>

      {/* Start Revision Button */}
      {dueNotes.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push("/revision")}
          style={[
            styles.revisionBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
          activeOpacity={0.85}
        >
          <View style={styles.revisionBtnContent}>
            <View>
              <Text style={[styles.revisionBtnTitle, { color: colors.primaryForeground }]}>
                Start Revision Session
              </Text>
              <Text style={[styles.revisionBtnSub, { color: colors.primaryForeground + "cc" }]}>
                {dueNotes.length} note{dueNotes.length !== 1 ? "s" : ""} due today
              </Text>
            </View>
            <View style={[styles.revisionBtnIcon, { backgroundColor: colors.primaryForeground + "20" }]}>
              <Feather name="arrow-right" size={22} color={colors.primaryForeground} />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Due Today section */}
      {dueNotes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Due Today
            </Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
              {dueNotes.length}
            </Text>
          </View>
          <View style={styles.noteList}>
            {dueNotes.slice(0, 5).map(({ note, plan }) => (
              <NoteCard
                key={note.id}
                note={note}
                plan={plan}
                onPress={() => router.push({ pathname: "/note-detail", params: { id: note.id } })}
                showDueBadge
              />
            ))}
          </View>
        </View>
      )}

      {/* Recent Notes */}
      {notes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Notes
            </Text>
            <TouchableOpacity onPress={() => router.push("/notes")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.noteList}>
            {[...notes]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 3)
              .map((note) => {
                const plan = revisionPlans.find((p) => p.noteId === note.id);
                return (
                  <NoteCard
                    key={note.id}
                    note={note}
                    plan={plan}
                    onPress={() => router.push({ pathname: "/note-detail", params: { id: note.id } })}
                  />
                );
              })}
          </View>
        </View>
      )}

      {notes.length === 0 && !isLoading && (
        <EmptyState
          icon="book-open"
          title="No notes yet"
          description="Create your first note and set up a revision schedule to start learning."
          actionLabel="Create Note"
          onAction={() => router.push("/add-note")}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  revisionBtn: {
    overflow: "hidden",
  },
  revisionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  revisionBtnTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  revisionBtnSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  revisionBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  noteList: {
    gap: 8,
  },
});
