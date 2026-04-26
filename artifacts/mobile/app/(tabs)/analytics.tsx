import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StreakBadge } from "@/components/StreakBadge";
import { BadgesGrid } from "@/components/BadgeCard";
import { RankLadder } from "@/components/RankLadder";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { RevisionLog, getDayLabel, getRevisionLogs, startOfDay } from "@/lib/storage";

// Large pool of mock leaderboard users — a rotating subset is shown every 30 s
const ALL_MOCK_USERS = [
  { name: "Priya S.",   baseReviews: 312, baseStreak: 42, avatar: "P" },
  { name: "James K.",   baseReviews: 278, baseStreak: 31, avatar: "J" },
  { name: "Meera R.",   baseReviews: 245, baseStreak: 28, avatar: "M" },
  { name: "David L.",   baseReviews: 198, baseStreak: 19, avatar: "D" },
  { name: "Ananya G.",  baseReviews: 165, baseStreak: 15, avatar: "A" },
  { name: "Tom H.",     baseReviews: 142, baseStreak: 11, avatar: "T" },
  { name: "Sarah W.",   baseReviews: 118, baseStreak:  8, avatar: "S" },
  { name: "Raj P.",     baseReviews:  89, baseStreak:  6, avatar: "R" },
  { name: "Emma B.",    baseReviews:  64, baseStreak:  4, avatar: "E" },
  { name: "Liam N.",    baseReviews: 290, baseStreak: 35, avatar: "L" },
  { name: "Sofia V.",   baseReviews: 255, baseStreak: 22, avatar: "S" },
  { name: "Chen W.",    baseReviews: 231, baseStreak: 27, avatar: "C" },
  { name: "Fatima A.",  baseReviews: 210, baseStreak: 21, avatar: "F" },
  { name: "Marco D.",   baseReviews: 187, baseStreak: 17, avatar: "M" },
  { name: "Yuki T.",    baseReviews: 174, baseStreak: 14, avatar: "Y" },
  { name: "Nadia K.",   baseReviews: 160, baseStreak: 13, avatar: "N" },
  { name: "Omar F.",    baseReviews: 148, baseStreak: 10, avatar: "O" },
  { name: "Isla M.",    baseReviews: 133, baseStreak:  9, avatar: "I" },
  { name: "Arjun B.",   baseReviews: 125, baseStreak:  7, avatar: "A" },
  { name: "Zara H.",    baseReviews: 115, baseStreak:  6, avatar: "Z" },
  { name: "Lucas C.",   baseReviews: 102, baseStreak:  5, avatar: "L" },
  { name: "Hana P.",    baseReviews:  97, baseStreak:  5, avatar: "H" },
  { name: "Ravi M.",    baseReviews:  85, baseStreak:  4, avatar: "R" },
  { name: "Chiara E.",  baseReviews:  78, baseStreak:  3, avatar: "C" },
  { name: "Sam O.",     baseReviews:  71, baseStreak:  3, avatar: "S" },
  { name: "Aaliya J.",  baseReviews:  59, baseStreak:  2, avatar: "A" },
  { name: "Felix B.",   baseReviews:  52, baseStreak:  2, avatar: "F" },
  { name: "Mila Q.",    baseReviews:  44, baseStreak:  1, avatar: "M" },
  { name: "Nico R.",    baseReviews:  38, baseStreak:  1, avatar: "N" },
  { name: "Tara S.",    baseReviews:  30, baseStreak:  1, avatar: "T" },
];

/** Seeded pseudo-random shuffle — same seed always yields same order */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick 9 users for the current rotation tick and add small stat variance */
function buildRotatingPool(tick: number) {
  const shuffled = seededShuffle(ALL_MOCK_USERS, tick * 0xdeadbeef);
  return shuffled.slice(0, 9).map((u) => {
    const reviewVariance = ((tick * 7 + u.baseReviews) % 11) - 5;
    const streakVariance = ((tick * 3 + u.baseStreak) % 5) - 2;
    return {
      name: u.name,
      avatar: u.avatar,
      reviews: Math.max(1, u.baseReviews + reviewVariance),
      streak: Math.max(0, u.baseStreak + streakVariance),
    };
  });
}

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
          borderColor: isYou ? colors.primary + "55" : colors.border,
        },
      ]}
    >
      <View style={lbStyles.rankWrap}>
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
        <View style={lbStyles.nameRow}>
          <Text style={[lbStyles.name, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>
          {isYou && (
            <View style={[lbStyles.youChip, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[lbStyles.youText, { color: colors.primary }]}>You</Text>
            </View>
          )}
        </View>
        <Text style={[lbStyles.streak, { color: colors.mutedForeground }]}>
          🔥 {streak}d
        </Text>
      </View>
      <View style={lbStyles.reviewsCol}>
        <Text style={[lbStyles.reviewsValue, { color: isYou ? colors.primary : colors.foreground }]}>
          {reviews}
        </Text>
        <Text style={[lbStyles.reviewsLabel, { color: colors.mutedForeground }]}>
          reviews
        </Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userStats, notes, categories, rankInfo } = useApp();
  const [revisionLogs, setRevisionLogs] = useState<RevisionLog[]>([]);
  const [lbExpanded, setLbExpanded] = useState(false);

  const [lbTick, setLbTick] = useState(() => Math.floor(Date.now() / 30_000));
  useEffect(() => {
    const id = setInterval(() => setLbTick(Math.floor(Date.now() / 30_000)), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getRevisionLogs().then(setRevisionLogs).catch(() => {});
  }, [userStats.totalCompleted, userStats.totalSkipped]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

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

  const leaderboard = useMemo(() => {
    const pool = buildRotatingPool(lbTick);
    const realUser = {
      name: "You",
      avatar: "★",
      reviews: userStats.totalCompleted,
      streak: userStats.currentStreak,
      isYou: true,
    };
    const combined = [
      ...pool.map((u) => ({ ...u, isYou: false })),
      realUser,
    ]
      .sort((a, b) => {
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.reviews - a.reviews;
      })
      .slice(0, 10)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
    return combined;
  }, [lbTick, userStats.totalCompleted, userStats.currentStreak]);

  const yourRank = leaderboard.find((u) => u.isYou)?.rank ?? "-";

  // Visible leaderboard rows: top 5 + your row pinned underneath if not in top 5
  const visibleLeaderboard = useMemo(() => {
    if (lbExpanded) return leaderboard;
    const top5 = leaderboard.slice(0, 5);
    const youRow = leaderboard.find((u) => u.isYou);
    if (youRow && !top5.find((u) => u.isYou)) {
      return [...top5, youRow];
    }
    return top5;
  }, [leaderboard, lbExpanded]);
  const youInTop5 = leaderboard.slice(0, 5).some((u) => u.isYou);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 110 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your learning at a glance
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Open settings"
          onPress={() => router.push("/(tabs)/settings")}
          style={[
            styles.gearBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="settings" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Overview cards */}
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: "#FF6B00" }]}>
          <StreakBadge streak={userStats.currentStreak} size="md" />
          <Text style={[styles.overviewLabel, { color: colors.mutedForeground }]}>Streak</Text>
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

      {/* Rank Ladder (windowed by default) */}
      <RankLadder rank={rankInfo} totalCompleted={userStats.totalCompleted} />

      {/* Leaderboard */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.primary }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Feather name="award" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Leaderboard</Text>
          </View>
          <View style={[styles.rankChip, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.rankChipText, { color: colors.primary }]}>
              Rank #{yourRank}
            </Text>
          </View>
        </View>
        <View style={styles.leaderboardList}>
          {visibleLeaderboard.map((user, idx) => {
            const showSeparator =
              !lbExpanded && !youInTop5 && idx === visibleLeaderboard.length - 1;
            return (
              <React.Fragment key={`${user.name}-${user.rank}`}>
                {showSeparator && (
                  <View style={lbStyles.gapRow}>
                    <View style={[lbStyles.gapLine, { backgroundColor: colors.border }]} />
                    <Text style={[lbStyles.gapText, { color: colors.mutedForeground }]}>•••</Text>
                    <View style={[lbStyles.gapLine, { backgroundColor: colors.border }]} />
                  </View>
                )}
                <LeaderboardRow {...user} colors={colors} />
              </React.Fragment>
            );
          })}
        </View>
        {leaderboard.length > 5 && (
          <TouchableOpacity
            onPress={() => setLbExpanded((v) => !v)}
            activeOpacity={0.7}
            style={[styles.toggleBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.toggleText, { color: colors.primary }]}>
              {lbExpanded ? "Show fewer" : `Show all ${leaderboard.length}`}
            </Text>
            <Feather
              name={lbExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.primary }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Feather name="bar-chart-2" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Last 14 Days
            </Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Done</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Skip</Text>
            </View>
          </View>
        </View>
        <View style={styles.chart}>
          {last14Days.map((day, i) => {
            const completedHeight = ((day.completed / maxVal) * 100);
            const skippedHeight = ((day.skipped / maxVal) * 100);
            const totalHeight = completedHeight + skippedHeight;
            const isToday = day.date === startOfDay(Date.now());
            return (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barContainer}>
                  <View style={[styles.barBackground, { backgroundColor: colors.muted, borderRadius: 4 }]}>
                    {totalHeight > 0 && (
                      <View style={[styles.barFill, {
                        height: `${totalHeight}%`,
                        borderRadius: 4,
                        overflow: "hidden",
                      }]}>
                        {completedHeight > 0 && (
                          <LinearGradient
                            colors={[colors.primary, colors.primary + "B3"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ flex: completedHeight / (totalHeight || 1) }}
                          />
                        )}
                        {skippedHeight > 0 && (
                          <LinearGradient
                            colors={[colors.warning + "B3", colors.warning + "70"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ flex: skippedHeight / (totalHeight || 1) }}
                          />
                        )}
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
      </View>

      {/* Badges Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.warning }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Feather name="star" size={16} color={colors.warning} />
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
          <View style={styles.sectionHeaderRow}>
            <Feather name="folder" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              By Category
            </Text>
          </View>
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
                        <Text style={[styles.catName, { color: colors.foreground }]} numberOfLines={1}>
                          {cat.name}
                        </Text>
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
  content: { paddingHorizontal: 16, gap: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerBlock: { flex: 1, gap: 2 },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontWeight: "500" },
  overviewRow: { flexDirection: "row", gap: 8 },
  overviewCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewValue: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  overviewLabel: { fontSize: 10, fontWeight: "600", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  rankChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  rankChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  leaderboardList: { gap: 6 },
  chartCard: {
    padding: 14,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 2,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 100,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  barContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  barBackground: {
    height: 88,
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
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
  },
  section: { gap: 10 },
  categoryList: { gap: 8 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  catColorBar: {
    width: 4,
  },
  catContent: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  catTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  catLeft: { gap: 1, flex: 1 },
  catName: {
    fontSize: 13,
    fontWeight: "600",
  },
  catSub: {
    fontSize: 11,
  },
  catRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  catCompleted: {
    fontSize: 18,
    fontWeight: "800",
  },
  catTotal: {
    fontSize: 12,
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
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: -2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

const lbStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  rankWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rankMedal: {
    fontSize: 16,
  },
  rankNum: {
    fontSize: 13,
    fontWeight: "700",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  youChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 7,
  },
  youText: {
    fontSize: 9,
    fontWeight: "700",
  },
  streak: {
    fontSize: 10,
  },
  reviewsCol: {
    alignItems: "flex-end",
    gap: 0,
  },
  reviewsValue: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 17,
  },
  reviewsLabel: {
    fontSize: 9,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  gapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  gapLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  gapText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
