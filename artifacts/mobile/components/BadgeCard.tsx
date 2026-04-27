import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { ALL_BADGES, BadgeDef, RARITY_COLORS } from "@/lib/badges";

import { PremiumBadgeIcon } from "./PremiumBadgeIcon";

interface BadgeCardProps {
  badge: BadgeDef;
  earned: boolean;
  size?: "sm" | "md" | "lg";
}

export function BadgeCard({ badge, earned, size = "md" }: BadgeCardProps) {
  const colors = useColors();

  const containerSize = size === "sm" ? 40 : size === "lg" ? 72 : 56;

  const rarityColor = RARITY_COLORS[badge.rarity];

  return (
    <View style={[styles.badge, size === "sm" && styles.badgeSm, size === "lg" && styles.badgeLg]}>
      <View
        style={[
          styles.iconShadow,
          {
            shadowColor: earned ? badge.color : "#000",
            shadowOpacity: earned ? 0.45 : 0.18,
          },
        ]}
      >
        <PremiumBadgeIcon badge={badge} earned={earned} size={containerSize} />
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
            <View style={[styles.rarityChip, { backgroundColor: rarityColor + "22", borderColor: rarityColor + "55" }]}>
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
    width: 76,
  },
  badgeSm: {
    width: 44,
    gap: 0,
  },
  badgeLg: {
    width: 96,
    gap: 8,
  },
  iconShadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  name: {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 14,
  },
  rarityChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
