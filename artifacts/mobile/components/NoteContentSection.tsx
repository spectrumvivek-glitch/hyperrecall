import { Feather } from "@/components/Feather";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  content: string;
  /** Default open state — true so the user immediately sees the reading area. */
  defaultOpen?: boolean;
}

/**
 * Dedicated reading section shown below the main RevisionCard during a
 * revision session. Keeps the action card clean while giving the user a
 * comfortable, paper-like surface to read the full note.
 */
export function NoteContentSection({ content, defaultOpen = true }: Props) {
  const colors = useColors();
  const [open, setOpen] = useState(defaultOpen);

  if (!content || content.trim().length === 0) return null;

  const wordCount = content.trim().split(/\s+/).length;
  const readMins = Math.max(1, Math.round(wordCount / 200));

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius + 4,
          borderColor: colors.border,
          shadowColor: colors.primary,
        },
      ]}
    >
      {/* Top accent gradient bar */}
      <LinearGradient
        colors={["#6366F1", "#8B5CF6", "#EC4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      {/* Header */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen((o) => !o)}
        style={styles.header}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="book-open" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { color: colors.foreground }]}>Note Content</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {wordCount} word{wordCount !== 1 ? "s" : ""} · ~{readMins} min read
          </Text>
        </View>
        <View style={[styles.chevWrap, { backgroundColor: colors.muted }]}>
          <Feather
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </TouchableOpacity>

      {/* Body — paper-like reading area */}
      {open && (
        <View
          style={[
            styles.paper,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.body, { color: colors.foreground }]} selectable>
            {content}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  chevWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  paper: {
    margin: 14,
    marginTop: 0,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  charPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  charText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
