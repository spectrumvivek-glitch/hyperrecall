import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StreakBadge } from "@/components/StreakBadge";
import { BadgesGrid } from "@/components/BadgeCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { RevisionLog, getDayLabel, getRevisionLogs, startOfDay } from "@/lib/storage";

// Deterministic mock leaderboard users
const MOCK_USERS = [
  { name: "Priya S.", reviews: 312, streak: 42, avatar: "P" },
  { name: "James K.", reviews: 278, streak: 31, avatar: "J" },
  { name: "Meera R.", reviews: 245, streak: 28, avatar: "M" },
  { name: "David L.", reviews: 198, streak: 19, avatar: "D" },
  { name: "Ananya G.", reviews: 165, streak: 15, avatar: "A" },
  { name: "Tom H.", reviews: 142, streak: 11, avatar: "T" },
  { name: "Sarah W.", reviews: 118, streak: 8, avatar: "S" },
  { name: "Raj P.", reviews: 89, streak: 6, avatar: "R" },
  { name: "Emma B.", reviews: 64, streak: 4, avatar: "E" },
];

const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7C32"];

function LeaderboardRow({
  rank,
  name,
  avatar,
  reviews,
  streak,
  isYou,
  colors,
}: {
  rank: number;
  name: string;
  avatar: string;
  reviews: number;
  streak: number;
  isYou: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const rankColor = rank <= 3 ? RANK_COLORS[rank - 1] : colors.mutedForeground;
  return (
    <View
      style={[
        lbStyles.row,
        {
          backgroundColor: isYou ? colors.primary + "12" : colors.card,
          borderColor: isYou ? colors.primary + "50" : colors.border,
        },
      ]}
    >
      <View style={[lbStyles.rankWrap, { width: 28 }]}>
        {rank <= 3 ? (
          <Text style={[lbStyles.rankMedal, { color: rankColor }]}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </Text>
        ) : (
          <Text style={[lbStyles.rankNum, { color: colors.mutedForeground }]}>
            {rank}
          </Text>
        )}
      </View>
      <View
        style={[
          lbStyles.avatar,
          {
            backgroundColor: isYou ? colors.primary + "25" : colors.muted,
            borderColor: isYou ? colors.primary + "60" : colors.border,
          },
        ]}
      >
        <Text style={[lbStyles.avatarText, { color: isYou ? colors.primary : colors.mutedForeground }]}>
          {avatar}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <View style={styles.nameRow}>
          <Text style={[lbStyles.name, { color: colors.foreground }]}>
            {name}
          </Text>
          {isYou && (
            <View style={[lbStyles.youChip, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[lbStyles.youText, { color: colors.primary }]}>You</Text>
            </View>
          )}
        </View>
        <Text style={[lbStyles.streak, { color: colors.mutedForeground }]}>
          🔥 {streak}-day streak
        </Text>
      </View>
      <Text style={[lbStyles.reviews, { color: isYou ? colors.primary : colors.foreground }]}>
        {reviews}
        {"\n"}
        <Text style={[lbStyles.reviewsLabel, { color: colors.mutedForeground }]}>reviews</Text>
      </Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userStats, notes, categories } = useApp();
  const [revisionLogs, setRevisionLogs] = useState<RevisionLog[]>([]);

  useEffect(() => {
    getRevisionLogs().then(setRevisionLogs).catch(() => {});
  }, [userStats.totalCompleted, userStats.totalSkipped]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Last 14 days data
  const last14Days = useMemo(() => {
    const days: { label: string; date: number; completed: number; skipped: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = startOfDay(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayLogs = revisionLogs.filter(
        (l) => l.date >= dayStart && l.date < dayEnd
      );
      days.push({
        label: getDayLabel(dayStart),
        date: dayStart,
        completed: dayLogs.filter((l) => l.status === "completed").length,
        skipped: dayLogs.filter((l) => l.status === "skipped").length,
      });
    }
    return days;
  }, [revisionLogs]);

  const maxVal = Math.max(...last14Days.map((d) => d.completed + d.skipped), 1);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    return categories.map((cat) => {
      const catNotes = notes.filter((n) => n.categoryId === cat.id);
      const catLogs = revisionLogs.filter((l) =>
        catNotes.some((n) => n.id === l.noteId)
      );
      return {
        ...cat,
        noteCount: catNotes.length,
        reviewCount: catLogs.length,
        completedCount: catLogs.filter((l) => l.status === "completed").length,
      };
    });
  }, [categories, notes, revisionLogs]);

  const totalCompleted = revisionLogs.filter((l) => l.status === "completed").length;
  const totalSkipped = revisionLogs.filter((l) => l.status === "skipped").length;
  const completionRate =
    totalCompleted + totalSkipped > 0
      ? Math.round((totalCompleted / (totalCompleted + totalSkipped)) * 100)
      : 0;

  // Build leaderboard with real user mixed in
  const leaderboard = useMemo(() => {
    const realUser = {
      name: "You",
      avatar: "★",
      reviews: userStats.totalCompleted,
      streak: userStats.currentStreak,
      isYou: true,
    };
    const combined = [
      ...MOCK_USERS.map((u) => ({ ...u, isYou: false })),
      realUser,
    ]
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, 10)
      .map((user, i) => ({ ...user, rank: i + 1 }));
    return combined;
  }, [userStats.totalCompleted, userStats.currentStreak]);

  const yourRank = leaderboard.find((u) => u.isYou)?.rank ?? "-";

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 20, paddingBottom: bottomPad + 110 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>

      {/* Overview cards */}
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: "#FF6B00" }]}>
          <StreakBadge streak={userStats.currentStreak} size="lg" />
          <Text style={[styles.overviewLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.success }]}>
          <Text style={[styles.overviewValue, { color: colors.success }]}>{completionRate}%</Text>
          <Text style={[styles.overviewLabel, { color: colors.mutedForeground }]}>Completion</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.primary }]}>
          <Text style={[styles.overviewValue, { color: colors.foreground }]}>{totalCompleted}</Text>
          <Text style={[styles.overviewLabel, { color: colors.mutedForeground }]}>Reviews</Text>
        </View>
      </View>

      {/* Leaderboard */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Feather name="award" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Leaderboard</Text>
          </View>
          <View style={[styles.rankChip, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.rankChipText, { color: colors.primary }]}>
              Rank #{yourRank}
            </Text>
          </View>
        </View>
        <View style={styles.leaderboardList}>
          {leaderboard.map((user) => (
            <LeaderboardRow key={user.name} {...user} colors={colors} />
          ))}
        </View>
      </View>

      {/* Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.primary }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          14-Day Activity
        </Text>
        <View style={styles.chart}>
          {last14Days.map((day, i) => {
            const completedHeight = ((day.completed / maxVal) * 100);
            const skippedHeight = ((day.skipped / maxVal) * 100);
            const totalHeight = completedHeight + skippedHeight;
            const isToday = day.date === startOfDay(Date.now());
            return (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barContainer}>
                  <View style={[styles.barBackground, { backgroundColor: colors.muted, borderRadius: 6 }]}>
                    {totalHeight > 0 && (
                      <View style={[styles.barFill, {
                        height: `${totalHeight}%`,
                        borderRadius: 6,
                        overflow: "hidden",
                      }]}>
                        <View style={{ flex: completedHeight / (totalHeight || 1), backgroundColor: colors.primary }} />
                        <View style={{ flex: skippedHeight / (totalHeight || 1), backgroundColor: colors.warning + "80" }} />
                      </View>
                    )}
                  </View>
                </View>
                {isToday && (
                  <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Skipped</Text>
          </View>
        </View>
      </View>

      {/* Badges Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Feather name="star" size={18} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Badges</Text>
          </View>
          <Text style={[styles.badgeCount, { color: colors.mutedForeground }]}>
            {(userStats.earnedBadges ?? []).length} earned
          </Text>
        </View>
        <BadgesGrid earnedBadges={userStats.earnedBadges ?? []} />
      </View>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            By Category
          </Text>
          <View style={styles.categoryList}>
            {categoryBreakdown.map((cat) => {
              const pct = cat.reviewCount > 0
                ? Math.round((cat.completedCount / cat.reviewCount) * 100)
                : 0;
              return (
                <View
                  key={cat.id}
                  style={[
                    styles.categoryRow,
                    { backgroundColor: colors.card, borderColor: colors.border, shadowColor: cat.color },
                  ]}
                >
                  <View style={[styles.catColorBar, { backgroundColor: cat.color }]} />
                  <View style={styles.catContent}>
                    <View style={styles.catTop}>
                      <View style={styles.catLeft}>
                        <Text style={[styles.catName, { color: colors.foreground }]}>{cat.name}</Text>
                        <Text style={[styles.catSub, { color: colors.mutedForeground }]}>
                          {cat.noteCount} note{cat.noteCount !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <View style={styles.catRight}>
                        <Text style={[styles.catCompleted, { color: colors.success }]}>
                          {cat.completedCount}
                        </Text>
                        <Text style={[styles.catTotal, { color: colors.mutedForeground }]}>
                          /{cat.reviewCount}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.catProgressTrack, { backgroundColor: colors.muted }]}>
                      <View style={[styles.catProgressFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 20 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  overviewRow: { flexDirection: "row", gap: 10 },
  overviewCard: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  overviewValue: { fontSize: 28, fontWeight: "800" },
  overviewLabel: { fontSize: 11, fontWeight: "600", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rankChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rankChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  leaderboardList: { gap: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chartCard: {
    padding: 18,
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 130,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  barContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  barBackground: {
    height: 110,
    width: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  legend: {
    flexDirection: "row",
    gap: 18,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  section: { gap: 14 },
  categoryList: { gap: 10 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  catColorBar: {
    width: 4,
  },
  catContent: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  catTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catLeft: { gap: 2 },
  catName: {
    fontSize: 14,
    fontWeight: "600",
  },
  catSub: {
    fontSize: 12,
  },
  catRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  catCompleted: {
    fontSize: 20,
    fontWeight: "800",
  },
  catTotal: {
    fontSize: 13,
  },
  catProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  catProgressFill: {
    height: 4,
    borderRadius: 2,
  },
});

const lbStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  rankMedal: {
    fontSize: 18,
  },
  rankNum: {
    fontSize: 14,
    fontWeight: "700",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  youChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youText: {
    fontSize: 10,
    fontWeight: "700",
  },
  streak: {
    fontSize: 11,
  },
  reviews: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    lineHeight: 18,
  },
  reviewsLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
