import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatFileSize } from "@/lib/pdfPicker";
import { NoteAttachment } from "@/lib/storage";

interface Props {
  attachment: NoteAttachment;
  onRemove?: () => void;
  compact?: boolean;
}

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 268435456;

async function fileExists(uri: string): Promise<boolean> {
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

async function openPdf(uri: string, name: string) {
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
      } catch (e: any) {
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

    // Strategy 2: explicit ACTION_VIEW intent with PDF mime type. Works even
    // when the URL scheme isn't independently registered as openable.
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
        type: "application/pdf",
      });
      return;
    } catch (e: any) {
      // Try to distinguish "stale/unreadable URI" (legacy content:// from old
      // saves) from "no PDF reader installed" so the message stays helpful.
      const msg = String(e?.message ?? "").toLowerCase();
      // Heuristics: error text suggests the file/uri is the problem, OR the
      // saved URI was a legacy non-file scheme (stale content://) which we
      // can't probe via FileSystem.getInfoAsync.
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
      // Otherwise: most likely no activity to handle application/pdf.
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

export function PdfAttachmentCard({ attachment, onRemove, compact = false }: Props) {
  const colors = useColors();
  const showRemove = !compact && !!onRemove;
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fileExists(attachment.uri).then((ok) => {
      if (!cancelled) setMissing(!ok);
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.uri]);

  const handlePress = () => {
    if (missing) {
      Alert.alert(
        "File missing",
        "Yeh PDF ab available nahi hai. Please dobara upload karein.",
      );
      return;
    }
    openPdf(attachment.uri, attachment.name);
  };

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: colors.card, borderColor: colors.border },
        missing && styles.cardMissing,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.row, compact && styles.rowCompact]}
        onPress={handlePress}
      >
        <View
          style={[
            styles.iconWrap,
            compact && styles.iconWrapCompact,
            { backgroundColor: (missing ? "#94A3B8" : "#EF4444") + "18" },
          ]}
        >
          <Feather
            name={missing ? "alert-triangle" : "file-text"}
            size={compact ? 18 : 22}
            color={missing ? "#94A3B8" : "#EF4444"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.name,
              compact && styles.nameCompact,
              { color: missing ? colors.mutedForeground : colors.foreground },
            ]}
            numberOfLines={1}
          >
            {attachment.name}
          </Text>
          <Text
            style={[styles.meta, compact && styles.metaCompact, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {missing
              ? "File missing — re-upload karein"
              : `PDF${attachment.sizeBytes ? `  •  ${formatFileSize(attachment.sizeBytes)}` : ""}`}
          </Text>
        </View>
        {compact ? (
          <Feather
            name={missing ? "alert-circle" : "external-link"}
            size={14}
            color={colors.mutedForeground}
          />
        ) : (
          <View style={[styles.openBtn, { borderColor: colors.border }]}>
            <Feather
              name={missing ? "alert-circle" : "external-link"}
              size={14}
              color={colors.mutedForeground}
            />
          </View>
        )}
      </TouchableOpacity>
      {showRemove && (
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={14} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  cardCompact: {
    borderRadius: 10,
  },
  cardMissing: {
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  rowCompact: {
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  name: { fontSize: 14, fontWeight: "700" },
  nameCompact: { fontSize: 13, fontWeight: "600" },
  meta: { fontSize: 11, marginTop: 2 },
  metaCompact: { fontSize: 10, marginTop: 1 },
  openBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
