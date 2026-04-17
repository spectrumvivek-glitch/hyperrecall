import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

type PurchasesPackage = import("react-native-purchases").PurchasesPackage;

const FEATURES = [
  { icon: "layers" as const, title: "Unlimited notes", subtitle: "No cap on how much you save" },
  { icon: "image" as const, title: "Multi-image notes", subtitle: "Attach as many photos as you need" },
  { icon: "cloud" as const, title: "Cloud sync across devices", subtitle: "Stay in sync everywhere" },
  { icon: "bar-chart-2" as const, title: "Advanced analytics", subtitle: "Track every streak and stat" },
  { icon: "award" as const, title: "Gamification + leaderboard", subtitle: "Earn XP, levels, and badges" },
  { icon: "bell" as const, title: "Smart reminders", subtitle: "Never miss a revision" },
];

function packageBadge(pkg: PurchasesPackage): { label: string; color: string } | null {
  const id = pkg.identifier;
  if (id === "$rc_lifetime") return { label: "Best Value", color: "#10b981" };
  if (id === "$rc_annual") return { label: "Most Popular", color: "#4f46e5" };
  return null;
}

function packageTitle(pkg: PurchasesPackage): string {
  switch (pkg.identifier) {
    case "$rc_lifetime":
      return "Lifetime";
    case "$rc_annual":
      return "Yearly";
    case "$rc_monthly":
      return "Monthly";
    default:
      return pkg.product.title || pkg.identifier;
  }
}

function packageSubtitle(pkg: PurchasesPackage): string {
  switch (pkg.identifier) {
    case "$rc_lifetime":
      return "One-time payment, forever";
    case "$rc_annual":
      return "Billed yearly · just ₹83/mo";
    case "$rc_monthly":
      return "Billed monthly";
    default:
      return "";
  }
}

function packagePrice(pkg: PurchasesPackage): string {
  switch (pkg.identifier) {
    case "$rc_lifetime":
      return "₹1,999";
    case "$rc_annual":
      return "₹999";
    case "$rc_monthly":
      return "₹99";
    default:
      return pkg.product.priceString;
  }
}

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    packages,
    isLoading,
    isAvailable,
    purchasePackage,
    restorePurchases,
    isPro,
    error,
    refresh,
  } = useSubscription();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const sortedPackages = useMemo(() => {
    const order = ["$rc_lifetime", "$rc_annual", "$rc_monthly"];
    return [...packages].sort(
      (a, b) => order.indexOf(a.identifier) - order.indexOf(b.identifier),
    );
  }, [packages]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setBusyId(pkg.identifier);
    const result = await purchasePackage(pkg);
    setBusyId(null);
    if (result === "purchased") {
      Alert.alert("Welcome to Recallify Pro!", "Thanks for subscribing.");
      router.back();
    } else if (result === "error") {
      Alert.alert("Purchase failed", error ?? "Please try again.");
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const ok = await restorePurchases();
    setRestoring(false);
    Alert.alert(
      ok ? "Restored" : "Nothing to restore",
      ok ? "Welcome back to Recallify Pro." : "We didn't find any active purchases on this account.",
    );
    if (ok) router.back();
  };

  const close = () => router.back();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={close} style={styles.closeBtn} activeOpacity={0.7}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroIcon, { backgroundColor: colors.primary + "1a" }]}>
          <Feather name="zap" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>Recallify Pro</Text>
        <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
          Unlock the full spaced repetition experience
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name={f.icon} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
                <Text style={[styles.featureSubtitle, { color: colors.mutedForeground }]}>
                  {f.subtitle}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {isPro ? (
          <View
            style={[
              styles.proBanner,
              { backgroundColor: colors.primary + "14", borderColor: colors.primary + "40" },
            ]}
          >
            <Feather name="check-circle" size={20} color={colors.primary} />
            <Text style={[styles.proBannerText, { color: colors.foreground }]}>
              You're on Recallify Pro
            </Text>
          </View>
        ) : !isAvailable ? (
          <View style={[styles.notice, { backgroundColor: colors.warning + "14" }]}>
            <Feather name="smartphone" size={16} color={colors.warning} />
            <Text style={[styles.noticeText, { color: colors.warning }]}>
              {Platform.OS === "web"
                ? "Open Recallify on your phone (via a development build) to subscribe."
                : "Subscriptions require the native build of Recallify."}
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Loading plans…
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.notice, { backgroundColor: colors.destructive + "14" }]}>
            <Feather name="alert-triangle" size={16} color={colors.destructive} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeText, { color: colors.destructive }]}>{error}</Text>
              <TouchableOpacity onPress={refresh} activeOpacity={0.7} style={{ marginTop: 8 }}>
                <Text
                  style={[styles.restoreText, { color: colors.destructive, textAlign: "left" }]}
                >
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : sortedPackages.length === 0 ? (
          <View style={[styles.notice, { backgroundColor: colors.warning + "14" }]}>
            <Feather name="alert-circle" size={16} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeText, { color: colors.warning }]}>
                No plans available right now. Please try again later.
              </Text>
              <TouchableOpacity onPress={refresh} activeOpacity={0.7} style={{ marginTop: 8 }}>
                <Text style={[styles.restoreText, { color: colors.warning, textAlign: "left" }]}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.packages}>
            {sortedPackages.map((pkg) => {
              const badge = packageBadge(pkg);
              const busy = busyId === pkg.identifier;
              return (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => handlePurchase(pkg)}
                  disabled={!!busyId}
                  style={({ pressed }) => [
                    styles.pkgCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: badge ? colors.primary : colors.border,
                      opacity: pressed && !busy ? 0.85 : 1,
                    },
                    badge ? styles.pkgCardHighlight : null,
                  ]}
                >
                  {badge && (
                    <View style={[styles.badge, { backgroundColor: badge.color }]}>
                      <Text style={styles.badgeText}>{badge.label}</Text>
                    </View>
                  )}
                  <View style={styles.pkgRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pkgTitle, { color: colors.foreground }]}>
                        {packageTitle(pkg)}
                      </Text>
                      <Text style={[styles.pkgSubtitle, { color: colors.mutedForeground }]}>
                        {packageSubtitle(pkg)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.pkgPrice, { color: colors.foreground }]}>
                        {packagePrice(pkg)}
                      </Text>
                      {busy && <ActivityIndicator size="small" color={colors.primary} />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          onPress={handleRestore}
          disabled={!isAvailable || restoring}
          style={styles.restoreBtn}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
              Restore purchases
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the end of the period.
          Manage in your store account settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 },
  closeBtn: { padding: 8, borderRadius: 20 },
  scroll: { paddingHorizontal: 20, alignItems: "stretch" },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  heroTitle: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  heroSubtitle: { fontSize: 15, textAlign: "center", marginTop: 6 },
  features: { gap: 14, marginTop: 28, marginBottom: 24 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: 15, fontWeight: "500" },
  featureSubtitle: { fontSize: 12, marginTop: 2 },
  loading: { paddingVertical: 24, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginVertical: 6,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  proBannerText: { fontSize: 14, fontWeight: "600" },
  packages: { gap: 12, marginTop: 4 },
  pkgCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    paddingTop: 18,
  },
  pkgCardHighlight: { borderWidth: 2 },
  badge: {
    position: "absolute",
    top: -10,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  pkgRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pkgTitle: { fontSize: 18, fontWeight: "600" },
  pkgSubtitle: { fontSize: 13, marginTop: 2 },
  pkgPrice: { fontSize: 18, fontWeight: "700" },
  restoreBtn: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  restoreText: { fontSize: 14, textDecorationLine: "underline" },
  footnote: { fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 8 },
});
