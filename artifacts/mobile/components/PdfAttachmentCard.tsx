import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { fileExists } from "@/lib/openPdfExternally";
import { formatFileSize } from "@/lib/pdfPicker";
import { NoteAttachment } from "@/lib/storage";

interface Props {
  attachment: NoteAttachment;
  onRemove?: () => void;
  compact?: boolean;
}

export function PdfAttachmentCard({ attachment, onRemove, compact = false }: Props) {
  const colors = useColors();
  const router = useRouter();
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
    // Open inside the app. The viewer itself handles falling back to the
    // system PDF handler if rendering fails.
    router.push({
      pathname: "/pdf-viewer",
      params: { uri: attachment.uri, name: attachment.name },
    });
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
            name={missing ? "alert-circle" : "chevron-right"}
            size={14}
            color={colors.mutedForeground}
          />
        ) : (
          <View style={[styles.openBtn, { borderColor: colors.border }]}>
            <Feather
              name={missing ? "alert-circle" : "chevron-right"}
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
