import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StreakBadge } from "@/components/StreakBadge";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { getDayLabel, startOfDay } from "@/lib/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAR_WIDTH = 28;

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { revisionLogs, userStats, notes, categories } = useApp();

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

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>

      {/* Overview cards */}
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
          <StreakBadge streak={userStats.currentStreak} size="lg" />
          <Text style={[styles.overviewLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.overviewValue, { color: colors.success }]}>{completionRate}%</Text>
          <Text style={[styles.overviewLabel, { color: colors.mutedForeground }]}>Completion Rate</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.overviewValue, { color: colors.foreground }]}>{totalCompleted}</Text>
          <Text style={[styles.overviewLabel, { color: colors.mutedForeground }]}>Total Reviews</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
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
                  <View style={[styles.barBackground, { backgroundColor: colors.muted, borderRadius: 4 }]}>
                    {totalHeight > 0 && (
                      <View style={[styles.barFill, {
                        height: `${totalHeight}%`,
                        borderRadius: 4,
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

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            By Category
          </Text>
          <View style={styles.categoryList}>
            {categoryBreakdown.map((cat) => (
              <View
                key={cat.id}
                style={[
                  styles.categoryRow,
                  { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <View style={styles.catLeft}>
                  <View style={[styles.catColorBar, { backgroundColor: cat.color }]} />
                  <View>
                    <Text style={[styles.catName, { color: colors.foreground }]}>{cat.name}</Text>
                    <Text style={[styles.catSub, { color: colors.mutedForeground }]}>
                      {cat.noteCount} note{cat.noteCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
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
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 20 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  overviewRow: { flexDirection: "row", gap: 8 },
  overviewCard: { flex: 1, padding: 14, alignItems: "center", gap: 6 },
  overviewValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  overviewLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  chartCard: { padding: 16, gap: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 120,
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
    height: 100,
    width: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: { gap: 12 },
  categoryList: { gap: 8 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  catLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  catColorBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  catName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  catSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  catRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  catCompleted: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  catTotal: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
