import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Alert, Platform } from "react-native";

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 268435456;

export async function fileExists(uri: string): Promise<boolean> {
  if (!uri) return false;
  if (Platform.OS === "web") return true;
  if (!uri.startsWith("file://")) return true;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return !!info.exists;
  } catch {
    return false;
  }
}

/**
 * Hand the PDF off to whatever PDF reader the user has installed (system
 * browser on iOS / web, ACTION_VIEW intent on Android). Used as a manual
 * "open externally" action and as an automatic fallback when the in-app
 * viewer fails to render.
 */
export async function openPdfExternally(uri: string, _name?: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await WebBrowser.openBrowserAsync(uri);
      return;
    }

    if (Platform.OS === "ios") {
      await WebBrowser.openBrowserAsync(uri);
      return;
    }

    // Android — verify file then hand off to a real PDF viewer.
    if (uri.startsWith("file://")) {
      const exists = await fileExists(uri);
      if (!exists) {
        Alert.alert(
          "File missing",
          "Yeh PDF ab available nahi hai. Please dobara upload karein.",
        );
        return;
      }
    }

    let contentUri = uri;
    if (uri.startsWith("file://")) {
      try {
        contentUri = await FileSystem.getContentUriAsync(uri);
      } catch {
        Alert.alert(
          "Couldn't open PDF",
          "PDF ko prepare karne me dikkat aayi. Please dobara try karein.",
        );
        return;
      }
    }

    // Strategy 1: Linking.openURL — uses the system's default PDF handler
    // (or shows a chooser if none is set). This is the most reliable path
    // and avoids the share sheet entirely.
    try {
      const can = await Linking.canOpenURL(contentUri);
      if (can) {
        await Linking.openURL(contentUri);
        return;
      }
    } catch {
      // fall through to intent launcher
    }

    // Strategy 2: explicit ACTION_VIEW intent with PDF mime type.
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
        type: "application/pdf",
      });
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? "").toLowerCase();
      const looksLikeBadUri =
        msg.includes("no such file") ||
        msg.includes("not found") ||
        msg.includes("permission denial") ||
        msg.includes("failed to find") ||
        msg.includes("fileuriexposed") ||
        (!uri.startsWith("file://") && !uri.startsWith("http"));
      if (looksLikeBadUri) {
        Alert.alert(
          "File missing",
          "Yeh PDF ab available nahi hai. Please dobara upload karein.",
        );
        return;
      }
      Alert.alert(
        "No PDF reader found",
        "Koi PDF reader nahi mila. Google Drive ya Adobe Acrobat install karein, fir try karein.",
      );
      return;
    }
  } catch (err: any) {
    Alert.alert(
      "Couldn't open PDF",
      err?.message ?? "Kuch galat ho gaya. Please dobara try karein.",
    );
  }
}
