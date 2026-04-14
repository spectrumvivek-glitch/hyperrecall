import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { ALL_BADGES, BadgeDef, RARITY_COLORS } from "@/lib/badges";

interface BadgeCardProps {
  badge: BadgeDef;
  earned: boolean;
  size?: "sm" | "md" | "lg";
}

export function BadgeCard({ badge, earned, size = "md" }: BadgeCardProps) {
  const colors = useColors();

  const iconSize = size === "sm" ? 18 : size === "lg" ? 28 : 22;
  const containerSize = size === "sm" ? 40 : size === "lg" ? 64 : 52;
  const borderRadius = containerSize / 2.5;

  const rarityColor = RARITY_COLORS[badge.rarity];

  return (
    <View style={[styles.badge, size === "sm" && styles.badgeSm, size === "lg" && styles.badgeLg]}>
      <View
        style={[
          styles.iconWrap,
          {
            width: containerSize,
            height: containerSize,
            borderRadius,
            backgroundColor: earned ? badge.color + "20" : colors.muted,
            borderColor: earned ? badge.color + "60" : colors.border,
          },
        ]}
      >
        <Feather
          name={badge.icon as any}
          size={iconSize}
          color={earned ? badge.color : colors.mutedForeground + "60"}
        />
      </View>
      {size !== "sm" && (
        <>
          <Text
            style={[
              styles.name,
              { color: earned ? colors.foreground : colors.mutedForeground, fontSize: size === "lg" ? 13 : 11 },
            ]}
            numberOfLines={2}
          >
            {badge.name}
          </Text>
          {earned && (
            <View style={[styles.rarityChip, { backgroundColor: rarityColor + "20" }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {badge.rarity}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

interface BadgesGridProps {
  earnedBadges: string[];
}

export function BadgesGrid({ earnedBadges }: BadgesGridProps) {
  const colors = useColors();
  const earnedSet = new Set(earnedBadges);

  const earned = ALL_BADGES.filter((b) => earnedSet.has(b.id));
  const locked = ALL_BADGES.filter((b) => !earnedSet.has(b.id));
  const ordered = [...earned, ...locked];

  return (
    <View style={styles.grid}>
      {ordered.map((badge) => (
        <View key={badge.id} style={styles.gridItem}>
          <BadgeCard badge={badge} earned={earnedSet.has(badge.id)} size="md" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    gap: 6,
    width: 72,
  },
  badgeSm: {
    width: 44,
    gap: 0,
  },
  badgeLg: {
    width: 90,
    gap: 8,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  name: {
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },
  rarityChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "23%",
    alignItems: "center",
  },
});
