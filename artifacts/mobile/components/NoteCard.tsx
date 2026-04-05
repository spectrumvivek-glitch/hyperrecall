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

  const daysUntilDue = plan
    ? Math.ceil((plan.nextRevisionDate - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  const isDue = daysUntilDue !== null && daysUntilDue <= 0;
  const isUpcoming = daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 3;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: isDue ? colors.primary + "40" : colors.border,
          borderWidth: isDue ? 1.5 : 1,
        },
      ]}
    >
      {note.images.length > 0 && (
        <View style={styles.imageRow}>
          {note.images.slice(0, 3).map((img) => (
            <Image
              key={img.id}
              source={{ uri: img.uri }}
              style={[styles.thumbnail, { borderRadius: colors.radius - 4 }]}
              resizeMode="cover"
            />
          ))}
          {note.images.length > 3 && (
            <View
              style={[
                styles.moreImages,
                {
                  borderRadius: colors.radius - 4,
                  backgroundColor: colors.muted,
                },
              ]}
            >
              <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                +{note.images.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {note.title}
          </Text>
          {showDueBadge && isDue && (
            <View
              style={[
                styles.dueBadge,
                { backgroundColor: colors.primary, borderRadius: colors.radius / 2 },
              ]}
            >
              <Text style={styles.dueText}>Due</Text>
            </View>
          )}
        </View>

        {note.content.length > 0 && (
          <Text
            style={[styles.content, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            {note.content}
          </Text>
        )}

        <View style={styles.footer}>
          {category && (
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: category.color + "20",
                  borderRadius: colors.radius / 2,
                },
              ]}
            >
              <View
                style={[styles.categoryDot, { backgroundColor: category.color }]}
              />
              <Text style={[styles.categoryText, { color: category.color }]}>
                {category.name}
              </Text>
            </View>
          )}

          {plan && (
            <View style={styles.revisionInfo}>
              <Feather
                name="refresh-cw"
                size={11}
                color={
                  isDue
                    ? colors.primary
                    : isUpcoming
                    ? colors.warning
                    : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.revisionText,
                  {
                    color: isDue
                      ? colors.primary
                      : isUpcoming
                      ? colors.warning
                      : colors.mutedForeground,
                  },
                ]}
              >
                {isDue
                  ? "Today"
                  : daysUntilDue === 1
                  ? "Tomorrow"
                  : `${daysUntilDue}d`}
              </Text>
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
  },
  imageRow: {
    flexDirection: "row",
    gap: 4,
    padding: 10,
    paddingBottom: 0,
  },
  thumbnail: {
    width: 60,
    height: 60,
  },
  moreImages: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  body: {
    padding: 12,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    lineHeight: 20,
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dueText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  revisionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  revisionText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
