import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Note, RevisionPlan } from "@/lib/storage";

interface Props {
  note: Note;
  plan?: RevisionPlan;
  onPress: () => void;
  showDueBadge?: boolean;
}

export function NoteCard({ note, plan, onPress, showDueBadge }: Props) {
  const colors = useColors();
  const { categories } = useApp();
  const category = categories.find((c) => c.id === note.categoryId);
  const catColor = category?.color ?? colors.primary;

  const daysUntilDue = plan
    ? Math.ceil((plan.nextRevisionDate - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  const isDue = daysUntilDue !== null && daysUntilDue <= 0;
  const isUpcoming = daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 3;

  const revisionColor = isDue ? colors.primary : isUpcoming ? colors.warning : colors.mutedForeground;
  const revisionLabel = isDue
    ? "Due today"
    : daysUntilDue === 1
    ? "Tomorrow"
    : daysUntilDue !== null
    ? `In ${daysUntilDue}d`
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: isDue ? colors.primary + "40" : colors.border,
          shadowColor: isDue ? colors.primary : "#000",
        },
      ]}
    >
      <View style={[styles.leftAccent, { backgroundColor: catColor }]} />

      <View style={styles.inner}>
        {note.images.length > 0 && (
          <View style={styles.imageStrip}>
            {note.images.slice(0, 3).map((img) => (
              <Image
                key={img.id}
                source={{ uri: img.uri }}
                style={[styles.thumbnail, { borderRadius: 8 }]}
                resizeMode="cover"
              />
            ))}
            {note.images.length > 3 && (
              <View style={[styles.moreImages, { borderRadius: 8, backgroundColor: colors.muted }]}>
                <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                  +{note.images.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.titleArea}>
              {category && (
                <View style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: catColor }]} />
                  <Text style={[styles.catText, { color: catColor }]}>{category.name}</Text>
                </View>
              )}
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
                {note.title}
              </Text>
            </View>
            {showDueBadge && isDue && (
              <View style={[styles.duePill, { backgroundColor: colors.primary }]}>
                <View style={styles.dueDot} />
                <Text style={styles.dueText}>Due</Text>
              </View>
            )}
          </View>

          {note.content.length > 0 && (
            <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
              {note.content}
            </Text>
          )}

          {revisionLabel && (
            <View style={styles.footerRow}>
              <View style={[styles.revisionPill, { backgroundColor: revisionColor + "18" }]}>
                <Feather name="clock" size={10} color={revisionColor} />
                <Text style={[styles.revisionText, { color: revisionColor }]}>{revisionLabel}</Text>
              </View>
              {plan && (
                <Text style={[styles.stepText, { color: colors.mutedForeground }]}>
                  Step {plan.currentStep + 1}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    flexDirection: "row",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  leftAccent: {
    width: 4,
  },
  inner: { flex: 1 },
  imageStrip: {
    flexDirection: "row",
    gap: 4,
    padding: 12,
    paddingBottom: 0,
  },
  thumbnail: { width: 56, height: 56 },
  moreImages: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: { fontSize: 12, fontWeight: "700" },
  body: { padding: 14, gap: 7 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  titleArea: { flex: 1, gap: 3 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  duePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dueDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#ffffff99" },
  dueText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  preview: { fontSize: 13, lineHeight: 19 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  revisionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  revisionText: { fontSize: 11, fontWeight: "600" },
  stepText: { fontSize: 11 },
});
