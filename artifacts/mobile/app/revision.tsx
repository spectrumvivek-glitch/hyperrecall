import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingXP } from "@/components/FloatingXP";
import { LevelUpModal } from "@/components/LevelUpModal";
import { RevisionCard } from "@/components/RevisionCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function RevisionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dueNotes, markCompleted, markSkipped, pendingLevelUp, dismissLevelUp } = useApp();

  // Snapshot due notes at session start so context refreshes don't shift the index
  const [sessionNotes] = useState(() => [...dueNotes]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(0);
  const [sessionSkipped, setSessionSkipped] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [done, setDone] = useState(false);
  const [showXp, setShowXp] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleComplete = async (sm2Quality?: number) => {
    const item = sessionNotes[currentIndex];
    if (!item) return;
    const earned = await markCompleted(item.note.id, sm2Quality);
    setSessionCompleted((c) => c + 1);
    setSessionXp((x) => x + earned);
    setXpAmount(earned);
    setShowXp(true);
    advance();
  };

  const handleSkip = async () => {
    const item = sessionNotes[currentIndex];
    if (!item) return;
    await markSkipped(item.note.id);
    setSessionSkipped((s) => s + 1);
    advance();
  };

  const advance = () => {
    if (currentIndex < sessionNotes.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  if (done || sessionNotes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: bottomPad }]}>
        <LevelUpModal
          visible={!!pendingLevelUp}
          newLevel={pendingLevelUp?.newLevel ?? 1}
          levelName={pendingLevelUp?.levelName ?? ""}
          xpGained={pendingLevelUp?.xpGained ?? 0}
          onDismiss={dismissLevelUp}
        />
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: topPad + 8 }]} activeOpacity={0.7}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.doneContent}>
          <View style={[styles.doneIconWrap, { backgroundColor: colors.success + "15" }]}>
            <Feather name="check-circle" size={52} color={colors.success} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>Session Complete!</Text>
          <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
            You've reviewed all due notes for today.
          </Text>

          <View style={[styles.doneStats, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.doneStat}>
              <Text style={[styles.doneStatValue, { color: colors.success }]}>{sessionCompleted}</Text>
              <Text style={[styles.doneStatLabel, { color: colors.mutedForeground }]}>Completed</Text>
            </View>
            <View style={[styles.doneStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.doneStat}>
              <Text style={[styles.doneStatValue, { color: colors.warning }]}>{sessionSkipped}</Text>
              <Text style={[styles.doneStatLabel, { color: colors.mutedForeground }]}>Skipped</Text>
            </View>
            <View style={[styles.doneStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.doneStat}>
              <Text style={[styles.doneStatValue, { color: colors.primary }]}>+{sessionXp}</Text>
              <Text style={[styles.doneStatLabel, { color: colors.mutedForeground }]}>XP Earned</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentItem = sessionNotes[currentIndex];
  const progress = (currentIndex / sessionNotes.length) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LevelUpModal
        visible={!!pendingLevelUp}
        newLevel={pendingLevelUp?.newLevel ?? 1}
        levelName={pendingLevelUp?.levelName ?? ""}
        xpGained={pendingLevelUp?.xpGained ?? 0}
        onDismiss={dismissLevelUp}
      />
      <FloatingXP amount={xpAmount} visible={showXp} onHide={() => setShowXp(false)} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn2} activeOpacity={0.7}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              {currentIndex + 1} of {sessionNotes.length}
            </Text>
            <View style={[styles.xpTag, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="zap" size={11} color={colors.primary} />
              <Text style={[styles.xpTagText, { color: colors.primary }]}>+{sessionXp} XP</Text>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <RevisionCard
          note={currentItem.note}
          plan={currentItem.plan}
          onComplete={handleComplete}
          onSkip={handleSkip}
          isLast={currentIndex === sessionNotes.length - 1}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { position: "absolute", right: 16, padding: 8 },
  backBtn2: { padding: 4 },
  progressSection: { flex: 1, gap: 6 },
  progressLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressLabel: { fontSize: 13 },
  xpTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  xpTagText: { fontSize: 11 },
  progressTrack: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  scrollContent: { paddingVertical: 16, gap: 16 },
  doneContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  doneIconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  doneTitle: { fontSize: 26, textAlign: "center" },
  doneSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneStats: { flexDirection: "row", alignSelf: "stretch", marginVertical: 8 },
  doneStat: { flex: 1, alignItems: "center", padding: 16, gap: 4 },
  doneStatValue: { fontSize: 28 },
  doneStatLabel: { fontSize: 12 },
  doneStatDivider: { width: 1, marginVertical: 12 },
  doneBtn: { alignSelf: "stretch", paddingVertical: 14, alignItems: "center", marginTop: 8 },
  doneBtnText: { fontSize: 16 },
});
