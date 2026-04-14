import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[xpStyles.fill, { width: `${Math.max(3, Math.round(progressPct * 100))}%` }]}
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
          { paddingTop: topPad + 20, paddingBottom: bottomPad + 110 },
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
              Good{new Date().getHours() < 12 ? " morning" : new Date().getHours() < 17 ? " afternoon" : " evening"} 👋
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Recallify</Text>
          </View>
          <StreakBadge streak={userStats.currentStreak} size="md" />
        </View>

        {/* Level + XP Card */}
        <View
          style={[
            styles.levelCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary + "35",
              shadowColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.levelCardAccent, { backgroundColor: colors.primary + "10" }]} />
          <View style={styles.levelRow}>
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelBadge}
            >
              <Text style={styles.levelBadgeText}>Lv.{xpInfo.level}</Text>
            </LinearGradient>
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
              style={[styles.shareBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "45" }]}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={15} color={colors.primary} />
              <Text style={[styles.shareBtnText, { color: colors.primary }]}>+10 XP</Text>
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
          <View style={[styles.todayCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "35" }]}>
            <Feather name="zap" size={16} color={colors.primary} />
              <Text style={[styles.todayText, { color: colors.primary }]}>
              <Text style={{ fontWeight: "800" }}>{userStats.todayCompleted}</Text> note{userStats.todayCompleted !== 1 ? "s" : ""} revised today
              {userStats.todayCompleted > 0 && ` • +${userStats.todayCompleted * 10} XP`}
            </Text>
          </View>
        )}

        {/* Start Revision Button */}
        {dueNotes.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push("/revision")}
            activeOpacity={0.85}
            style={[styles.revisionBtn, { shadowColor: colors.primary }]}
          >
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.revisionGradient}
            >
              <View style={styles.revisionBtnContent}>
                <View>
                  <Text style={styles.revisionBtnTitle}>
                    Start Revision Session
                  </Text>
                  <Text style={styles.revisionBtnSub}>
                    {dueNotes.length} note{dueNotes.length !== 1 ? "s" : ""} due • earn {dueNotes.length * 10}+ XP
                  </Text>
                </View>
                <View style={styles.revisionBtnIcon}>
                  <Feather name="arrow-right" size={22} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Due Today */}
        {dueNotes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Due Today</Text>
              <View style={[styles.sectionBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.sectionCount, { color: colors.primary }]}>{dueNotes.length}</Text>
              </View>
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
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontSize: 13, fontWeight: "500" },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  levelCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  levelCardAccent: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    borderRadius: 60,
    transform: [{ translateX: 40 }, { translateY: -40 }],
  },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  levelName: { fontSize: 16, fontWeight: "700" },
  xpLabel: { fontSize: 12, marginTop: 1 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 13, fontWeight: "700" },
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  todayText: { fontSize: 14, fontWeight: "500", flex: 1 },
  statsRow: { flexDirection: "row", gap: 10 },
  revisionBtn: {
    borderRadius: 18,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  revisionGradient: {},
  revisionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  revisionBtnTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  revisionBtnSub: { fontSize: 13, color: "#ffffffbb", marginTop: 3 },
  revisionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff20",
  },
  section: { gap: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  sectionCount: { fontSize: 13, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  noteList: { gap: 10 },
});

const xpStyles = StyleSheet.create({
  wrap: { gap: 7 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 11, fontWeight: "500" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});

const impStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  text: { flex: 1, fontSize: 14, fontWeight: "500" },
});
