import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  ExamReviewItem,
  ExamSession,
  Note,
  completeExamReviewItem,
  createExamSession,
  deleteExamSession,
  formatDate,
  getExamSessions,
  getRevisionPlans,
  skipExamReviewItem,
  startOfDay,
} from "@/lib/storage";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const EXAM_PROPORTIONS = [0, 0.08, 0.15, 0.23, 0.31, 0.38, 0.46, 0.54, 0.62, 0.69, 0.77, 0.85, 0.92, 1.0];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDaysLeft(examDate: number): number {
  const today = startOfDay(Date.now());
  const exam = startOfDay(examDate);
  return Math.max(0, Math.ceil((exam - today) / (24 * 60 * 60 * 1000)));
}

function getProgressStats(session: ExamSession) {
  const done = session.schedule.filter((item) => item.completed).length;
  const total = session.schedule.length;
  return { done, total, pct: total > 0 ? done / total : 0 };
}

function getTodayDue(session: ExamSession): ExamReviewItem[] {
  const todayEnd = startOfDay(Date.now()) + 24 * 60 * 60 * 1000;
  return session.schedule.filter((item) => !item.completed && item.scheduledDate < todayEnd);
}

// ── Calendar Picker ────────────────────────────────────────────────────────────

function CalendarPicker({
  selectedDate,
  onChange,
}: {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
}) {
  const colors = useColors();
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  minDate.setHours(0, 0, 0, 0);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() - 1);
    setViewMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + 1);
    setViewMonth(d);
  };

  const isSelected = (day: number) =>
    !!selectedDate &&
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month &&
    selectedDate.getDate() === day;

  const isDisabled = (day: number) => new Date(year, month, day) < minDate;

  return (
    <View style={calStyles.container}>
      <View style={calStyles.header}>
        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[calStyles.monthTitle, { color: colors.foreground }]}>
          {MONTHS[month]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-right" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={calStyles.dayNames}>
        {DAY_NAMES.map((d) => (
          <Text key={d} style={[calStyles.dayName, { color: colors.mutedForeground }]}>{d}</Text>
        ))}
      </View>

      <View style={calStyles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={calStyles.cell} />;
          const sel = isSelected(day);
          const dis = isDisabled(day);
          return (
            <TouchableOpacity
              key={`d${day}`}
              style={[calStyles.cell, sel && { backgroundColor: colors.primary, borderRadius: 22 }, dis && { opacity: 0.25 }]}
              onPress={() => !dis && onChange(new Date(year, month, day))}
              disabled={dis}
              activeOpacity={0.7}
            >
              <Text style={[calStyles.dayNum, { color: sel ? "#fff" : colors.foreground }]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  monthTitle: { fontSize: 16, fontWeight: "700" },
  dayNames: { flexDirection: "row" },
  dayName: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", paddingVertical: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayNum: { fontSize: 14, fontWeight: "500" },
});

// ── Schedule Preview (mini bar chart) ─────────────────────────────────────────

function SchedulePreview({ noteIds, examDate }: { noteIds: string[]; examDate: Date }) {
  const colors = useColors();
  const today = startOfDay(Date.now());
  const lastDay = startOfDay(examDate.getTime()) - 24 * 60 * 60 * 1000;
  const totalDays = Math.max(0, Math.ceil((lastDay - today) / (24 * 60 * 60 * 1000)));
  const totalReviews = noteIds.length * 14;
  const BUCKETS = 7;
  const counts = new Array(BUCKETS).fill(0);
  for (let ni = 0; ni < noteIds.length; ni++) {
    for (let i = 0; i < 14; i++) {
      const dayOffset = Math.min(Math.round(EXAM_PROPORTIONS[i] * totalDays), totalDays);
      const bucket = Math.min(Math.floor((dayOffset / Math.max(1, totalDays)) * BUCKETS), BUCKETS - 1);
      counts[bucket]++;
    }
  }
  const maxCount = Math.max(...counts, 1);
  const firstStr = new Date(today).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lastStr = new Date(lastDay).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View style={[pvStyles.card, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Text style={[pvStyles.title, { color: colors.foreground }]}>Schedule Preview</Text>

      <View style={pvStyles.statsRow}>
        {[
          { label: "Notes", value: noteIds.length },
          { label: "Reviews each", value: 14 },
          { label: "Total reviews", value: totalReviews },
        ].map(({ label, value }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <View style={[pvStyles.divider, { backgroundColor: colors.border }]} />}
            <View style={pvStyles.stat}>
              <Text style={[pvStyles.statValue, { color: colors.primary }]}>{value}</Text>
              <Text style={[pvStyles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <View style={pvStyles.chart}>
        {counts.map((count, i) => (
          <View key={i} style={pvStyles.chartCol}>
            <View style={[pvStyles.chartBar, {
              height: Math.max(6, (count / maxCount) * 60),
              backgroundColor: colors.primary,
              opacity: 0.3 + (count / maxCount) * 0.7,
            }]} />
            <Text style={[pvStyles.chartLabel, { color: colors.mutedForeground }]}>
              {i === 0 ? firstStr : i === BUCKETS - 1 ? lastStr : ""}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[pvStyles.hint, { color: colors.mutedForeground }]}>
        Reviews are spread equally across all available days up to the exam
      </Text>
    </View>
  );
}

const pvStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  title: { fontSize: 14, fontWeight: "700" },
  statsRow: { flexDirection: "row", alignItems: "center" },
  divider: { width: 1, height: 36, marginHorizontal: 12 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, textAlign: "center" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 76 },
  chartCol: { flex: 1, alignItems: "center", gap: 4 },
  chartBar: { width: "100%", borderRadius: 4 },
  chartLabel: { fontSize: 9, textAlign: "center" },
  hint: { fontSize: 11, lineHeight: 16, textAlign: "center" },
});

// ── Exam Review Card (inline review flow) ─────────────────────────────────────

function ExamReviewCard({
  item,
  note,
  categories,
  onComplete,
  onSkip,
  busy,
}: {
  item: ExamReviewItem;
  note: Note;
  categories: { id: string; name: string; color: string }[];
  onComplete: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const colors = useColors();
  const [phase, setPhase] = useState<"preview" | "study">("preview");
  const [imgIndex, setImgIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);

  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitTranslateY = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const cat = categories.find((c) => c.id === note.categoryId);
  const catColor = cat?.color ?? "#6366F1";
  const catName = cat?.name ?? "General";
  const hasImages = note.images && note.images.length > 0;

  const handleStart = () => {
    setPhase("study");
    Animated.spring(expandAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 9 }).start();
  };

  const handleComplete = () => {
    Animated.parallel([
      Animated.timing(exitOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(exitScale, { toValue: 0.88, duration: 220, useNativeDriver: true }),
      Animated.timing(exitTranslateY, { toValue: -16, duration: 250, useNativeDriver: true }),
    ]).start(() => onComplete());
  };

  const expandScale = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  const expandOpacity = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <>
      {viewerOpen && hasImages && (
        <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={() => setViewerOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "#000" }}>
            <TouchableOpacity
              onPress={() => setViewerOpen(false)}
              style={{ position: "absolute", top: 50, right: 18, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "#ffffff20", alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: viewerStart * SCREEN_W, y: 0 }} style={{ flex: 1 }}>
              {note.images.map((img) => (
                <ScrollView key={img.id} style={{ width: SCREEN_W, height: SCREEN_H }} contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }} maximumZoomScale={4} minimumZoomScale={1} centerContent bouncesZoom>
                  <TouchableWithoutFeedback onPress={() => setViewerOpen(false)}>
                    <Image source={{ uri: img.uri }} style={{ width: SCREEN_W, height: SCREEN_H }} resizeMode="contain" />
                  </TouchableWithoutFeedback>
                </ScrollView>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      <Animated.View style={[
        ercStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: exitOpacity, transform: [{ scale: exitScale }, { translateY: exitTranslateY }] },
      ]}>
        <View style={[ercStyles.catBar, { backgroundColor: catColor }]} />
        <View style={ercStyles.inner}>
          <View style={ercStyles.meta}>
            <View style={ercStyles.catRow}>
              <View style={[ercStyles.catDot, { backgroundColor: catColor }]} />
              <Text style={[ercStyles.catName, { color: colors.mutedForeground }]}>{catName}</Text>
            </View>
            <View style={[ercStyles.badge, { backgroundColor: "#6366F115" }]}>
              <Text style={[ercStyles.badgeText, { color: "#6366F1" }]}>Review {item.sessionIndex + 1}/14</Text>
            </View>
          </View>

          <Text style={[ercStyles.title, { color: colors.foreground }]} numberOfLines={phase === "preview" ? 2 : undefined}>
            {note.title}
          </Text>

          {phase === "study" && (
            <Animated.View style={{ opacity: expandOpacity, transform: [{ scale: expandScale }], gap: 12 }}>
              {hasImages && (
                <View style={{ gap: 8 }}>
                  <ScrollView
                    horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                    style={{ borderRadius: 10 }}
                    onMomentumScrollEnd={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 76)))}
                  >
                    {note.images.map((img, i) => (
                      <TouchableOpacity key={img.id} onPress={() => { setViewerStart(i); setViewerOpen(true); }} activeOpacity={0.9} style={{ position: "relative" }}>
                        <Image source={{ uri: img.uri }} style={{ width: SCREEN_W - 76, height: 200, borderRadius: 10, backgroundColor: "#f1f5f9" }} resizeMode="contain" />
                        <View style={{ position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#00000060", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Feather name="zoom-in" size={11} color="#fff" />
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>Tap to zoom</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {note.images.length > 1 && (
                    <View style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}>
                      {note.images.map((_, i) => (
                        <View key={i} style={{ height: 6, borderRadius: 3, width: i === imgIndex ? 18 : 6, backgroundColor: i === imgIndex ? colors.primary : colors.border }} />
                      ))}
                    </View>
                  )}
                </View>
              )}
              {note.content ? <Text style={{ fontSize: 14, lineHeight: 22, color: colors.foreground }}>{note.content}</Text> : null}
            </Animated.View>
          )}

          {phase === "preview" && note.content ? (
            <Text style={{ fontSize: 13, lineHeight: 18, color: colors.mutedForeground }} numberOfLines={2}>{note.content}</Text>
          ) : null}

          {phase === "preview" && (
            <View style={ercStyles.actions}>
              <TouchableOpacity onPress={onSkip} disabled={busy} style={[ercStyles.skipBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} activeOpacity={0.7}>
                <Feather name="skip-forward" size={13} color={colors.mutedForeground} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground }}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStart} disabled={busy} style={ercStyles.startWrap} activeOpacity={0.82}>
                <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ercStyles.startBtn}>
                  <Feather name="book-open" size={14} color="#fff" />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Start</Text>
                  <Feather name="chevron-right" size={14} color="#ffffffcc" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {phase === "study" && (
            <TouchableOpacity onPress={handleComplete} disabled={busy} style={{ borderRadius: 12, overflow: "hidden" }} activeOpacity={0.82}>
              <LinearGradient colors={["#22C55E", "#16A34A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13 }}>
                <Feather name="check-circle" size={16} color="#fff" />
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Mark Complete</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </>
  );
}

const ercStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, flexDirection: "row", overflow: "hidden", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  catBar: { width: 4 },
  inner: { flex: 1, padding: 13, gap: 9 },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: "500" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  actions: { flexDirection: "row", gap: 9 },
  skipBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 11, borderWidth: 1 },
  startWrap: { flex: 2, borderRadius: 11, overflow: "hidden" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
});

// ── Exam Card ─────────────────────────────────────────────────────────────────

function ExamCard({
  session,
  notes,
  categories,
  onComplete,
  onSkip,
  onDelete,
}: {
  session: ExamSession;
  notes: Note[];
  categories: { id: string; name: string; color: string }[];
  onComplete: (noteId: string, idx: number) => Promise<void>;
  onSkip: (noteId: string, idx: number) => Promise<void>;
  onDelete: () => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { done, total, pct } = getProgressStats(session);
  const daysLeft = getDaysLeft(session.examDate);
  const todayDue = getTodayDue(session);
  const isExamPast = daysLeft === 0 && startOfDay(session.examDate) < startOfDay(Date.now());
  const isComplete = done === total;
  const noteMap = new Map(notes.map((n) => [n.id, n]));

  const examDateStr = new Date(session.examDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

  const handleComplete = async (noteId: string, sessionIndex: number) => {
    const key = `${noteId}-${sessionIndex}`;
    setBusyKey(key);
    await onComplete(noteId, sessionIndex);
    setBusyKey(null);
  };

  const handleSkip = async (noteId: string, sessionIndex: number) => {
    const key = `${noteId}-${sessionIndex}`;
    setBusyKey(key);
    await onSkip(noteId, sessionIndex);
    setBusyKey(null);
  };

  const gradColors: [string, string] = isComplete
    ? ["#22C55E", "#16A34A"]
    : isExamPast
    ? ["#94a3b8", "#64748b"]
    : ["#6366F1", "#8B5CF6"];

  return (
    <View style={[ecStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Delete confirmation */}
      {confirmDelete && (
        <View style={[ecStyles.deleteOverlay, { backgroundColor: colors.card + "f8" }]}>
          <Feather name="trash-2" size={28} color="#EF4444" />
          <Text style={[ecStyles.deleteTitle, { color: colors.foreground }]}>Delete this exam?</Text>
          <Text style={[ecStyles.deleteSubtitle, { color: colors.mutedForeground }]}>
            All {total} scheduled reviews will be permanently removed.
          </Text>
          <View style={ecStyles.deleteActions}>
            <TouchableOpacity onPress={() => setConfirmDelete(false)} style={[ecStyles.delCancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} activeOpacity={0.7}>
              <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={ecStyles.delConfirmBtn} activeOpacity={0.8}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Gradient header */}
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ecStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={ecStyles.examName} numberOfLines={1}>{session.name}</Text>
          <Text style={ecStyles.examMeta}>
            {isComplete
              ? "🎉 All reviews complete!"
              : isExamPast
              ? "Exam date passed"
              : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left · ${examDateStr}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setConfirmDelete(true)} style={ecStyles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
          <Feather name="trash-2" size={15} color="#ffffff70" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Progress */}
      <View style={ecStyles.progressSection}>
        <View style={ecStyles.progressRow}>
          <Text style={[ecStyles.progressLabel, { color: colors.mutedForeground }]}>{done} / {total} reviews</Text>
          <Text style={[ecStyles.progressPct, { color: isComplete ? "#22C55E" : colors.primary }]}>
            {Math.round(pct * 100)}%
          </Text>
        </View>
        <View style={[ecStyles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[ecStyles.progressFill, {
            width: `${Math.round(pct * 100)}%` as any,
            backgroundColor: isComplete ? "#22C55E" : colors.primary,
          }]} />
        </View>
      </View>

      {/* Today's due toggle */}
      {todayDue.length > 0 && !isExamPast ? (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={[ecStyles.dueRow, { borderTopColor: colors.border }]}
          activeOpacity={0.75}
        >
          <View style={[ecStyles.dueBadge, { backgroundColor: "#EF444415" }]}>
            <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "800" }}>{todayDue.length}</Text>
          </View>
          <Text style={[ecStyles.dueText, { color: colors.foreground }]}>
            {todayDue.length} review{todayDue.length !== 1 ? "s" : ""} due today
          </Text>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={17} color={colors.mutedForeground} />
        </TouchableOpacity>
      ) : !isExamPast && !isComplete ? (
        <View style={[ecStyles.dueRow, { borderTopColor: colors.border }]}>
          <Feather name="check-circle" size={15} color="#22C55E" />
          <Text style={[ecStyles.dueText, { color: colors.mutedForeground }]}>No reviews due today</Text>
        </View>
      ) : null}

      {/* Expanded review cards */}
      {expanded && todayDue.length > 0 && (
        <View style={ecStyles.reviewList}>
          {todayDue.map((item) => {
            const note = noteMap.get(item.noteId);
            if (!note) return null;
            const key = `${item.noteId}-${item.sessionIndex}`;
            return (
              <ExamReviewCard
                key={key}
                item={item}
                note={note}
                categories={categories}
                onComplete={() => handleComplete(item.noteId, item.sessionIndex)}
                onSkip={() => handleSkip(item.noteId, item.sessionIndex)}
                busy={busyKey === key}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}


const ecStyles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  deleteOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  deleteTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  deleteSubtitle: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  deleteActions: { flexDirection: "row", gap: 12, marginTop: 6 },
  delCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  delConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#EF4444", alignItems: "center" },
  header: { padding: 18, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  examName: { fontSize: 18, fontWeight: "800", color: "#fff" },
  examMeta: { fontSize: 13, color: "#ffffffcc", marginTop: 3 },
  deleteBtn: { padding: 4 },
  progressSection: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, gap: 8 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressLabel: { fontSize: 13 },
  progressPct: { fontSize: 14, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1 },
  dueBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dueText: { flex: 1, fontSize: 14, fontWeight: "600" },
  reviewList: { padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: "#E8EDF4" },
  primaryBtn: { borderRadius: 12, overflow: "hidden" },
  primaryBtnGrad: { paddingVertical: 11, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

// ── Create Exam Modal ──────────────────────────────────────────────────────────

function CreateExamModal({
  visible,
  onClose,
  notes,
  categories,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  notes: Note[];
  categories: { id: string; name: string; color: string }[];
  onCreate: (name: string, date: Date, noteIds: string[]) => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"details" | "notes" | "preview">("details");
  const [examName, setExamName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [noteSearch, setNoteSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setStep("details");
    setExamName("");
    setSelectedDate(null);
    setSelectedNoteIds([]);
    setNoteSearch("");
    setCreating(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
    (categories.find((c) => c.id === n.categoryId)?.name ?? "").toLowerCase().includes(noteSearch.toLowerCase())
  );

  const toggleNote = (id: string) =>
    setSelectedNoteIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const canNext1 = examName.trim().length >= 2 && selectedDate !== null;
  const canNext2 = selectedNoteIds.length > 0;

  const handleCreate = async () => {
    if (!selectedDate) return;
    setCreating(true);
    try {
      await onCreate(examName.trim(), selectedDate, selectedNoteIds);
      handleClose();
    } finally {
      setCreating(false);
    }
  };

  const groupedNotes = [
    ...categories.map((cat) => ({
      cat,
      catNotes: filteredNotes.filter((n) => n.categoryId === cat.id),
    })).filter((g) => g.catNotes.length > 0),
    ...((() => {
      const catIds = new Set(categories.map((c) => c.id));
      const unc = filteredNotes.filter((n) => !catIds.has(n.categoryId));
      return unc.length > 0 ? [{ cat: { id: "__uncategorized__", name: "General", color: "#6366F1" }, catNotes: unc }] : [];
    })()),
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={mStyles.overlay}>
        <View style={[mStyles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={[mStyles.sheetHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={step === "details" ? handleClose : () => setStep(step === "notes" ? "details" : "notes")}
              style={mStyles.backBtn} activeOpacity={0.7}
            >
              <Feather name={step === "details" ? "x" : "arrow-left"} size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[mStyles.sheetTitle, { color: colors.foreground }]}>
              {step === "details" ? "New Exam" : step === "notes" ? "Select Notes" : "Review Schedule"}
            </Text>
            <View style={mStyles.stepDots}>
              {(["details", "notes", "preview"] as const).map((s) => (
                <View key={s} style={[mStyles.stepDot, { backgroundColor: step === s ? colors.primary : colors.border, width: step === s ? 20 : 8 }]} />
              ))}
            </View>
          </View>

          {/* ── Step 1: Details ── */}
          {step === "details" && (
            <ScrollView style={mStyles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[mStyles.fieldLabel, { color: colors.foreground }]}>Exam Name</Text>
              <TextInput
                value={examName}
                onChangeText={setExamName}
                placeholder="e.g. Biology Final, Physics Midterm..."
                placeholderTextColor={colors.mutedForeground}
                style={[mStyles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                maxLength={60}
                autoFocus
              />

              <Text style={[mStyles.fieldLabel, { color: colors.foreground, marginTop: 22 }]}>Exam Date</Text>
              <View style={[mStyles.calBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <CalendarPicker selectedDate={selectedDate} onChange={setSelectedDate} />
              </View>

              {selectedDate && (
                <View style={[mStyles.selectedBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                  <Feather name="calendar" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => canNext1 && setStep("notes")}
                style={[mStyles.actionBtn, { opacity: canNext1 ? 1 : 0.4, marginTop: 20, marginBottom: 8 }]}
                disabled={!canNext1}
                activeOpacity={0.85}
              >
                <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={mStyles.actionBtnGrad}>
                  <Text style={mStyles.actionBtnText}>Select Notes</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── Step 2: Notes ── */}
          {step === "notes" && (
            <>
              <View style={[mStyles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border, margin: 16, marginBottom: 8 }]}>
                <Feather name="search" size={15} color={colors.mutedForeground} />
                <TextInput
                  value={noteSearch}
                  onChangeText={setNoteSearch}
                  placeholder="Search notes..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[mStyles.searchInput, { color: colors.foreground }]}
                />
                {noteSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setNoteSearch("")} activeOpacity={0.7}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={mStyles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={mStyles.selectAllRow}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    {selectedNoteIds.length} of {notes.length} selected
                  </Text>
                  <TouchableOpacity onPress={() => {
                    if (selectedNoteIds.length === filteredNotes.length) setSelectedNoteIds([]);
                    else setSelectedNoteIds(filteredNotes.map((n) => n.id));
                  }} activeOpacity={0.7}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                      {selectedNoteIds.length === filteredNotes.length ? "Deselect All" : "Select All"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {groupedNotes.map(({ cat, catNotes }) => (
                  <View key={cat.id} style={{ marginBottom: 18 }}>
                    <View style={mStyles.catHeader}>
                      <View style={[mStyles.catDot, { backgroundColor: cat.color }]} />
                      <Text style={[mStyles.catLabel, { color: colors.mutedForeground }]}>{cat.name}</Text>
                    </View>
                    {catNotes.map((note) => {
                      const sel = selectedNoteIds.includes(note.id);
                      return (
                        <TouchableOpacity
                          key={note.id}
                          onPress={() => toggleNote(note.id)}
                          style={[mStyles.noteRow, {
                            backgroundColor: sel ? colors.primary + "0d" : colors.card,
                            borderColor: sel ? colors.primary + "50" : colors.border,
                          }]}
                          activeOpacity={0.75}
                        >
                          <View style={[mStyles.checkbox, {
                            borderColor: sel ? colors.primary : colors.border,
                            backgroundColor: sel ? colors.primary : "transparent",
                          }]}>
                            {sel && <Feather name="check" size={11} color="#fff" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[{ fontSize: 14, fontWeight: "600", color: colors.foreground }]} numberOfLines={1}>{note.title}</Text>
                            {note.images.length > 0 && (
                              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 1 }}>
                                {note.images.length} photo{note.images.length !== 1 ? "s" : ""}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {groupedNotes.length === 0 && (
                  <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                    <Feather name="file-text" size={32} color={colors.border} />
                    <Text style={{ color: colors.mutedForeground }}>No notes found</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                onPress={() => canNext2 && setStep("preview")}
                style={[mStyles.actionBtn, { opacity: canNext2 ? 1 : 0.4, marginHorizontal: 16 }]}
                disabled={!canNext2}
                activeOpacity={0.85}
              >
                <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={mStyles.actionBtnGrad}>
                  <Text style={mStyles.actionBtnText}>Preview Schedule</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3: Preview ── */}
          {step === "preview" && selectedDate && (
            <ScrollView style={mStyles.body} showsVerticalScrollIndicator={false}>
              <View style={[mStyles.previewHeader, { backgroundColor: "#6366F112", borderColor: "#6366F130" }]}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#6366F1" }}>{examName}</Text>
                <Text style={{ color: "#6366F1", fontSize: 13, marginTop: 4 }}>
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </Text>
              </View>

              <SchedulePreview noteIds={selectedNoteIds} examDate={selectedDate} />

              <Text style={[mStyles.fieldLabel, { color: colors.foreground, marginTop: 18 }]}>
                {selectedNoteIds.length} note{selectedNoteIds.length !== 1 ? "s" : ""} included
              </Text>
              {selectedNoteIds.map((id) => {
                const note = notes.find((n) => n.id === id);
                if (!note) return null;
                const cat = categories.find((c) => c.id === note.categoryId);
                return (
                  <View key={id} style={[mStyles.noteRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[mStyles.catDot, { backgroundColor: cat?.color ?? "#6366F1", width: 10, height: 10 }]} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: colors.foreground }} numberOfLines={1}>{note.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>× 14</Text>
                  </View>
                );
              })}

              <TouchableOpacity
                onPress={handleCreate}
                disabled={creating}
                style={[mStyles.actionBtn, { opacity: creating ? 0.7 : 1, marginTop: 20, marginBottom: 8 }]}
                activeOpacity={0.85}
              >
                <LinearGradient colors={["#22C55E", "#16A34A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={mStyles.actionBtnGrad}>
                  <Feather name="check-circle" size={16} color="#fff" />
                  <Text style={mStyles.actionBtnText}>{creating ? "Creating..." : "Create Exam Schedule"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000055" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", overflow: "hidden" },
  sheetHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: "700", marginLeft: 8 },
  stepDots: { flexDirection: "row", alignItems: "center", gap: 5 },
  stepDot: { height: 7, borderRadius: 4 },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  fieldLabel: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  textInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  calBox: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  selectedBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  actionBtn: { borderRadius: 14, overflow: "hidden" },
  actionBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  actionBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  selectAllRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  catHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  previewHeader: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16 },
});

// ── Main Exam Screen ───────────────────────────────────────────────────────────

export default function ExamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notes, categories } = useApp();

  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const loadExams = useCallback(async () => {
    const sessions = await getExamSessions();
    setExamSessions(sessions);
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  const handleCreate = async (name: string, date: Date, noteIds: string[]) => {
    await createExamSession(name, date.getTime(), noteIds);
    await loadExams();
  };

  const handleDelete = async (sessionId: string) => {
    await deleteExamSession(sessionId);
    await loadExams();
  };

  const handleComplete = async (sessionId: string, noteId: string, sessionIndex: number) => {
    await completeExamReviewItem(sessionId, noteId, sessionIndex);
    await loadExams();
  };

  const handleSkip = async (sessionId: string, noteId: string, sessionIndex: number) => {
    await skipExamReviewItem(sessionId, noteId, sessionIndex);
    await loadExams();
  };

  const totalDueToday = examSessions.reduce((acc, s) => acc + getTodayDue(s).length, 0);
  const hasExams = examSessions.length > 0;

  return (
    <>
      <CreateExamModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        notes={notes}
        categories={categories}
        onCreate={handleCreate}
      />

      <ScrollView
        style={[scStyles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[scStyles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={scStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[scStyles.title, { color: colors.foreground }]}>Exam Mode</Text>
            <Text style={[scStyles.subtitle, { color: colors.mutedForeground }]}>
              {!hasExams
                ? "14 focused reviews per note before your exam"
                : `${examSessions.length} active exam${examSessions.length !== 1 ? "s" : ""}${totalDueToday > 0 ? ` · ${totalDueToday} due today` : ""}`}
            </Text>
          </View>
          {totalDueToday > 0 && (
            <LinearGradient colors={["#EF4444", "#DC2626"]} style={scStyles.dueBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={scStyles.dueBadgeText}>{totalDueToday}</Text>
            </LinearGradient>
          )}
        </View>

        {/* How Exam Mode works — always visible */}
        <View style={[scStyles.infoBanner, { backgroundColor: colors.primary + "0e", borderColor: colors.primary + "30" }]}>
          <Text style={[scStyles.infoBannerTitle, { color: colors.primary }]}>How Exam Mode works</Text>
          {[
            ["📅", "Set your exam date"],
            ["📝", "Choose notes to include"],
            ["🧠", "Get 14 auto-scheduled reviews per note"],
            ["📈", "Front-loaded schedule for maximum retention"],
            ["⏰", "Best started 15–20 days before your exam"],
          ].map(([icon, text]) => (
            <View key={text as string} style={scStyles.infoBannerRow}>
              <Text style={{ fontSize: 15 }}>{icon}</Text>
              <Text style={[scStyles.infoBannerText, { color: colors.foreground }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Exam section header + create */}
        <View style={scStyles.sectionHeaderRow}>
          <Text style={[scStyles.sectionTitle, { color: colors.foreground }]}>
            {hasExams
              ? `Active Exams (${examSessions.length})`
              : "Your Exams"}
          </Text>
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            activeOpacity={0.85}
            style={[scStyles.addExamBtn, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}
          >
            <Feather name="plus" size={14} color={colors.primary} />
            <Text style={[scStyles.addExamBtnText, { color: colors.primary }]}>New Exam</Text>
          </TouchableOpacity>
        </View>

        {/* Exam cards */}
        {hasExams ? (
          examSessions.map((session) => (
            <ExamCard
              key={session.id}
              session={session}
              notes={notes}
              categories={categories}
              onComplete={(noteId, idx) => handleComplete(session.id, noteId, idx)}
              onSkip={(noteId, idx) => handleSkip(session.id, noteId, idx)}
              onDelete={() => handleDelete(session.id)}
            />
          ))
        ) : (
          <TouchableOpacity onPress={() => setShowCreate(true)} activeOpacity={0.85} style={[scStyles.createBtn, { shadowColor: colors.primary }]}>
            <LinearGradient colors={["#6366F1", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={scStyles.createBtnGrad}>
              <Feather name="plus-circle" size={20} color="#fff" />
              <Text style={scStyles.createBtnText}>Create New Exam</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

      </ScrollView>

    </>
  );
}

const scStyles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 3 },
  dueBadge: { minWidth: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  dueBadgeText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  infoBanner: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 10 },
  infoBannerTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  infoBannerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoBannerText: { fontSize: 14, flex: 1, lineHeight: 20 },
  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  addExamBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  addExamBtnText: { fontSize: 13, fontWeight: "700" },
  createBtn: { borderRadius: 16, overflow: "hidden", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  createBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 17 },
  createBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
