import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

/**
 * Compact banner shown on the home screen explaining trial status.
 * - Active trial: "X days left in free trial" + Upgrade pill
 * - Expired (and not paid Pro): "Your free trial has ended" + Upgrade pill
 * - Paid Pro: nothing (paywall card already shown elsewhere)
 */
export function TrialBanner() {
  const colors = useColors();
  const router = useRouter();
  const { isPaidPro, trial, trialDurationDays } = useSubscription();

  if (isPaidPro) return null;
  if (!trial.hasEverStarted) return null;

  const onUpgrade = () => router.push("/paywall");

  if (trial.isActive) {
    const days = trial.daysRemaining;
    const urgent = days <= 3;
    const gradient = urgent
      ? (["#F59E0B", "#EF4444"] as const)
      : (["#6366F1", "#8B5CF6"] as const);

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onUpgrade} style={styles.wrap}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.inner}>
          <View style={styles.iconWrap}>
            <Feather name={urgent ? "alert-circle" : "gift"} size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {urgent
                ? `Only ${days} day${days === 1 ? "" : "s"} left in your free trial`
                : `${days} day${days === 1 ? "" : "s"} left in your free trial`}
            </Text>
            <Text style={styles.sub}>
              {urgent
                ? "Upgrade now to keep unlimited notes & Exam Mode"
                : `All Pro features unlocked for ${trialDurationDays} days`}
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Upgrade</Text>
            <Feather name="arrow-right" size={14} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Trial expired
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onUpgrade} style={styles.wrap}>
      <View
        style={[
          styles.expiredCard,
          { backgroundColor: colors.warning + "15", borderColor: colors.warning + "55" },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.warning + "30" }]}>
          <Feather name="clock" size={18} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titleDark, { color: colors.foreground }]}>
            Your free trial has ended
          </Text>
          <Text style={[styles.subDark, { color: colors.mutedForeground }]}>
            Upgrade to HyperRecall Pro to keep adding notes & using Exam Mode
          </Text>
        </View>
        <View style={[styles.ctaDark, { backgroundColor: colors.warning }]}>
          <Text style={styles.ctaText}>Upgrade</Text>
          <Feather name="arrow-right" size={14} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ffffff25",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#fff" },
  sub: { fontSize: 12, color: "#ffffffd0", marginTop: 2 },
  titleDark: { fontSize: 14, fontWeight: "700" },
  subDark: { fontSize: 12, marginTop: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#ffffff25",
  },
  ctaDark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  ctaText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  expiredCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
});
