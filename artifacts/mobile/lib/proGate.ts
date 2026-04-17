import { Alert, Platform } from "react-native";
import type { Router } from "expo-router";

export const FREE_MAX_CATEGORIES = 3;
export const FREE_MAX_NOTES_PER_CATEGORY = 10;

export function showProGate(
  router: Router,
  title: string,
  message: string,
) {
  const goToPaywall = () => router.push("/paywall");
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}\n\nUpgrade to HyperRecall Pro?`)) {
      goToPaywall();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: "Maybe later", style: "cancel" },
    { text: "Upgrade to Pro", style: "default", onPress: goToPaywall },
  ]);
}
