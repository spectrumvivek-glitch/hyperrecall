import { Feather } from "@expo/vector-icons";
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
}

async function openPdf(uri: string, name: string) {
  try {
    if (Platform.OS === "web") {
      await WebBrowser.openBrowserAsync(uri);
      return;
    }
    const can = await Sharing.isAvailableAsync();
    if (can) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: name,
        UTI: "com.adobe.pdf",
      });
    } else {
      await WebBrowser.openBrowserAsync(uri);
    }
  } catch (err: any) {
    Alert.alert("Couldn't open PDF", err?.message ?? "Please try again.");
  }
}

export function PdfAttachmentCard({ attachment, onRemove }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.row}
        onPress={() => openPdf(attachment.uri, attachment.name)}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#EF4444" + "18" }]}>
          <Feather name="file-text" size={22} color="#EF4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {attachment.name}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
            PDF
            {attachment.sizeBytes ? `  •  ${formatFileSize(attachment.sizeBytes)}` : ""}
          </Text>
        </View>
        <View style={[styles.openBtn, { borderColor: colors.border }]}>
          <Feather name="external-link" size={14} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
      {onRemove && (
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700" },
  meta: { fontSize: 11, marginTop: 2 },
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
