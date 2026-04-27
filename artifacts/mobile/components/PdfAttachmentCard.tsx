import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatFileSize } from "@/lib/pdfPicker";
import { NoteAttachment } from "@/lib/storage";

interface Props {
  attachment: NoteAttachment;
  onRemove?: () => void;
  compact?: boolean;
}

async function openPdf(uri: string, name: string) {
  try {
    if (Platform.OS === "web") {
      await WebBrowser.openBrowserAsync(uri);
      return;
    }

    if (Platform.OS === "android") {
      // Convert file:// → content:// via FileProvider so other apps can read it,
      // then open with the system's default PDF viewer (no share sheet).
      try {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync(
          "android.intent.action.VIEW",
          {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: "application/pdf",
          }
        );
        return;
      } catch {
        // Fall through to sharing as a last resort if no PDF viewer is installed.
        const can = await Sharing.isAvailableAsync();
        if (can) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: name,
            UTI: "com.adobe.pdf",
          });
          return;
        }
        throw new Error("No PDF viewer available on this device.");
      }
    }

    // iOS: open in the in-app browser/QuickLook preview directly.
    await WebBrowser.openBrowserAsync(uri);
  } catch (err: any) {
    Alert.alert("Couldn't open PDF", err?.message ?? "Please try again.");
  }
}

export function PdfAttachmentCard({ attachment, onRemove, compact = false }: Props) {
  const colors = useColors();
  const showRemove = !compact && !!onRemove;
  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.row, compact && styles.rowCompact]}
        onPress={() => openPdf(attachment.uri, attachment.name)}
      >
        <View
          style={[
            styles.iconWrap,
            compact && styles.iconWrapCompact,
            { backgroundColor: "#EF4444" + "18" },
          ]}
        >
          <Feather name="file-text" size={compact ? 18 : 22} color="#EF4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.name, compact && styles.nameCompact, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {attachment.name}
          </Text>
          <Text
            style={[styles.meta, compact && styles.metaCompact, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            PDF
            {attachment.sizeBytes ? `  •  ${formatFileSize(attachment.sizeBytes)}` : ""}
          </Text>
        </View>
        {compact ? (
          <Feather name="external-link" size={14} color={colors.mutedForeground} />
        ) : (
          <View style={[styles.openBtn, { borderColor: colors.border }]}>
            <Feather name="external-link" size={14} color={colors.mutedForeground} />
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
