import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RevisionCard } from "@/components/RevisionCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function RevisionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dueNotes, markCompleted, markSkipped } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(0);
  const [sessionSkipped, setSessionSkipped] = useState(0);
  const [done, setDone] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleComplete = async () => {
    const item = dueNotes[currentIndex];
    if (!item) return;
    await markCompleted(item.note.id);
    setSessionCompleted((c) => c + 1);
    advance();
  };

  const handleSkip = async () => {
    const item = dueNotes[currentIndex];
    if (!item) return;
    await markSkipped(item.note.id);
    setSessionSkipped((s) => s + 1);
    advance();
  };

  const advance = () => {
    if (currentIndex < dueNotes.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  if (done || dueNotes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: bottomPad }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { top: topPad + 8 }]}
          activeOpacity={0.7}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.doneContent}>
          <View style={[styles.doneIcon, { backgroundColor: colors.success + "20", borderRadius: colors.radius * 3 }]}>
            <Feather name="check-circle" size={48} color={colors.success} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>
            Session Complete!
          </Text>
          <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
            You've reviewed all due notes for today.
          </Text>

          <View style={[styles.doneStats, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.doneStat}>
              <Text style={[styles.doneStatValue, { color: colors.success }]}>
                {sessionCompleted}
              </Text>
              <Text style={[styles.doneStatLabel, { color: colors.mutedForeground }]}>
                Completed
              </Text>
            </View>
            <View style={[styles.doneStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.doneStat}>
              <Text style={[styles.doneStatValue, { color: colors.warning }]}>
                {sessionSkipped}
              </Text>
              <Text style={[styles.doneStatLabel, { color: colors.mutedForeground }]}>
                Skipped
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentItem = dueNotes[currentIndex];
  const progress = ((currentIndex) / dueNotes.length) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn2}
          activeOpacity={0.7}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressSection}>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {currentIndex + 1} of {dueNotes.length}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${progress}%` },
              ]}
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <RevisionCard
          note={currentItem.note}
          plan={currentItem.plan}
          onComplete={handleComplete}
          onSkip={handleSkip}
          isLast={currentIndex === dueNotes.length - 1}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    position: "absolute",
    right: 16,
    padding: 8,
  },
  backBtn2: {
    padding: 4,
  },
  progressSection: {
    flex: 1,
    gap: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 16,
  },
  doneContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  doneIcon: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  doneTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  doneSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  doneStats: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginVertical: 8,
  },
  doneStat: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    gap: 4,
  },
  doneStatValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  doneStatLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  doneStatDivider: {
    width: 1,
    marginVertical: 12,
  },
  doneBtn: {
    alignSelf: "stretch",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
