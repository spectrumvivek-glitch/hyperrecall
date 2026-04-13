import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { LevelUpModal } from "@/components/LevelUpModal";
import { NoteCard } from "@/components/NoteCard";
import { StatCard } from "@/components/StatCard";
import { StreakBadge } from "@/components/StreakBadge";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function XpBar({ xpIntoLevel, xpNeeded, progressPct, colors }: {
  xpIntoLevel: number;
  xpNeeded: number;
  progressPct: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={xpStyles.wrap}>
      <View style={xpStyles.labelRow}>
        <Text style={[xpStyles.label, { color: colors.mutedForeground }]}>
          {xpIntoLevel} / {xpNeeded} XP
        </Text>
        <Text style={[xpStyles.label, { color: colors.mutedForeground }]}>
          Next level
        </Text>
      </View>
      <View style={[xpStyles.track, { backgroundColor: colors.muted }]}>
        <View
          style={[
            xpStyles.fill,
            { backgroundColor: colors.primary, width: `${Math.round(progressPct * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

function ImprovementBanner({ pct, colors }: {
  pct: number;
  colors: ReturnType<typeof useColors>;
}) {
  const positive = pct >= 0;
  const bg = positive ? colors.success + "15" : colors.warning + "15";
  const border = positive ? colors.success + "40" : colors.warning + "40";
  const textColor = positive ? colors.success : colors.warning;
  const icon = positive ? "trending-up" : "trending-down";
  const label = positive
    ? `You improved ${pct}% today! 🚀`
    : `You're ${Math.abs(pct)}% behind yesterday — keep going!`;

  return (
    <View style={[impStyles.banner, { backgroundColor: bg, borderColor: border }]}>
      <Feather name={icon} size={16} color={textColor} />
      <Text style={[impStyles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

async function shareStreak(streak: number, totalXp: number, level: number, levelName: string) {
  const message =
    `🔥 ${streak}-day study streak on Recallify!\n` +
    `⚡ Level ${level} ${levelName} • ${totalXp} XP earned\n` +
    `📚 Using spaced repetition to learn smarter, not harder.\n` +
    `#Recallify #SpacedRepetition #Learning`;
  try {
    await Share.share({ message, title: "My Recallify Streak" });
  } catch {
    // user cancelled or error
  }
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    dueNotes, userStats, notes, revisionPlans, isLoading, refresh,
    xpInfo, improvementPct, pendingLevelUp, dismissLevelUp, shareAndEarnXp,
  } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <LevelUpModal
        visible={!!pendingLevelUp}
        newLevel={pendingLevelUp?.newLevel ?? 1}
        levelName={pendingLevelUp?.levelName ?? ""}
        xpGained={pendingLevelUp?.xpGained ?? 0}
        onDismiss={dismissLevelUp}
      />

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
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Good{new Date().getHours() < 12 ? " morning" : new Date().getHours() < 17 ? " afternoon" : " evening"}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Recallify</Text>
          </View>
          <StreakBadge streak={userStats.currentStreak} size="md" />
        </View>

        {/* Level + XP Row */}
        <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.levelRow}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.levelBadgeText}>Lv.{xpInfo.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.levelName, { color: colors.foreground }]}>{xpInfo.levelName}</Text>
              <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
                {xpInfo.totalXp} XP total
              </Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                await shareStreak(userStats.currentStreak, xpInfo.totalXp, xpInfo.level, xpInfo.levelName);
                await shareAndEarnXp();
              }}
              style={[styles.shareBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={16} color={colors.primary} />
              <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share +10 XP</Text>
            </TouchableOpacity>
          </View>
          <XpBar
            xpIntoLevel={xpInfo.xpIntoLevel}
            xpNeeded={xpInfo.xpNeeded}
            progressPct={xpInfo.progressPct}
            colors={colors}
          />
        </View>

        {/* Improvement Banner */}
        {improvementPct !== null && userStats.todayCompleted > 0 && (
          <ImprovementBanner pct={improvementPct} colors={colors} />
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            label="Due Today"
            value={dueNotes.length}
            subtitle={dueNotes.length > 0 ? "Ready to review" : "All caught up!"}
            icon="refresh-cw"
            accentColor={dueNotes.length > 0 ? colors.primary : colors.success}
          />
          <StatCard
            label="Total Notes"
            value={notes.length}
            subtitle={`${revisionPlans.length} scheduled`}
            icon="file-text"
            accentColor={colors.warning}
          />
          <StatCard
            label="Completed"
            value={userStats.totalCompleted}
            subtitle="All time"
            icon="check-circle"
            accentColor={colors.success}
          />
        </View>

        {/* Today's Progress */}
        {userStats.todayCompleted > 0 && (
          <View style={[styles.todayCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Feather name="zap" size={16} color={colors.primary} />
            <Text style={[styles.todayText, { color: colors.primary }]}>
              <Text style={{ fontWeight: "700" }}>{userStats.todayCompleted}</Text> card{userStats.todayCompleted !== 1 ? "s" : ""} revised today
              {userStats.todayCompleted > 0 && ` • +${userStats.todayCompleted * 10} XP`}
            </Text>
          </View>
        )}

        {/* Start Revision Button */}
        {dueNotes.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push("/revision")}
            style={[styles.revisionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            activeOpacity={0.85}
          >
            <View style={styles.revisionBtnContent}>
              <View>
                <Text style={[styles.revisionBtnTitle, { color: colors.primaryForeground }]}>
                  Start Revision Session
                </Text>
                <Text style={[styles.revisionBtnSub, { color: colors.primaryForeground + "cc" }]}>
                  {dueNotes.length} note{dueNotes.length !== 1 ? "s" : ""} due • earn {dueNotes.length * 10}+ XP
                </Text>
              </View>
              <View style={[styles.revisionBtnIcon, { backgroundColor: colors.primaryForeground + "20" }]}>
                <Feather name="arrow-right" size={22} color={colors.primaryForeground} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Due Today */}
        {dueNotes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Due Today</Text>
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{dueNotes.length}</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Notes</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  levelCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  levelName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  xpLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 13, fontWeight: "600" },
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  todayText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 8 },
  revisionBtn: { overflow: "hidden" },
  revisionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  revisionBtnTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  revisionBtnSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  revisionBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  sectionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  noteList: { gap: 8 },
});

const xpStyles = StyleSheet.create({
  wrap: { gap: 5 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});

const impStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
