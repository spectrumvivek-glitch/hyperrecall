import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IntervalPicker } from "@/components/IntervalPicker";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { makePersistentUri } from "@/lib/imageUtils";
import { FREE_MAX_NOTES_PER_CATEGORY, showProGate } from "@/lib/proGate";
import { useSubscription } from "@/lib/revenuecat";
import { NoteImage, generateId } from "@/lib/storage";

const DEFAULT_INTERVALS = [0, 1, 2, 3, 5, 7, 10, 14, 18, 25, 35, 45, 60, 75, 90, 110, 130, 150, 180, 210, 240, 270, 300, 330, 365];

export default function AddNoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { categories, notes, addNote } = useApp();
  const { isPro } = useSubscription();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || "");
  const [images, setImages] = useState<NoteImage[]>([]);
  const [intervals, setIntervals] = useState<number[]>(DEFAULT_INTERVALS);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isWorking = isSaving;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pickImage = async () => {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErrorMsg("Permission required: Allow photo library access to add images.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      base64: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setErrorMsg(null);
      const persistentUris = await Promise.all(
        result.assets.map((asset) => makePersistentUri(asset.uri))
      );
      const newImages: NoteImage[] = result.assets.map((asset, i) => ({
        id: generateId(),
        noteId: "",
        uri: persistentUris[i],
        thumbnailUri: persistentUris[i],
      }));
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (title.trim().length === 0) {
      setErrorMsg("Please enter a title for your note.");
      return;
    }
    if (intervals.length === 0) {
      setErrorMsg("Please add at least one revision interval.");
      return;
    }

    const targetCategoryId = selectedCategory || categories[0]?.id || "";
    if (!isPro && targetCategoryId) {
      const notesInCategory = notes.filter((n) => n.categoryId === targetCategoryId).length;
      if (notesInCategory >= FREE_MAX_NOTES_PER_CATEGORY) {
        const catName = categories.find((c) => c.id === targetCategoryId)?.name ?? "this category";
        showProGate(
          "Note limit reached",
          `Free accounts can have up to ${FREE_MAX_NOTES_PER_CATEGORY} notes per category. "${catName}" is full. Upgrade to HyperRecall Pro for unlimited notes.`,
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      await addNote(
        title.trim(),
        selectedCategory || categories[0]?.id || "",
        content.trim(),
        images,
        intervals
      );
      router.back();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to save note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Note</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isWorking}
          style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2, opacity: isWorking ? 0.6 : 1 }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            {isSaving ? "Saving…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {errorMsg ? (
          <TouchableOpacity onPress={() => setErrorMsg(null)} activeOpacity={0.8} style={styles.errorBanner}>
            <Feather name="alert-circle" size={15} color="#DC2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Feather name="x" size={14} color="#DC2626" />
          </TouchableOpacity>
        ) : null}

        {/* Title */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.border }]}
            editable={!isWorking}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[
                      styles.categoryChip,
                      {
                        borderRadius: colors.radius / 2,
                        backgroundColor: isSelected ? cat.color : cat.color + "15",
                        borderColor: cat.color + "40",
                        borderWidth: 1,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryChipText, { color: isSelected ? "#fff" : cat.color }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes / Content</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Add Page number, formulas, explanations..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            style={[
              styles.contentInput,
              {
                color: colors.foreground,
                backgroundColor: colors.muted,
                borderRadius: colors.radius,
                borderColor: colors.border,
              },
            ]}
            editable={!isWorking}
          />
        </View>

        {/* Images */}
        <View style={styles.field}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Images ({images.length})
            </Text>
            <TouchableOpacity
              onPress={pickImage}
              disabled={isWorking}
              style={[styles.addImageBtn, { borderColor: colors.primary, borderRadius: colors.radius / 2 }]}
              activeOpacity={0.7}
            >
              <Feather name="image" size={14} color={colors.primary} />
              <Text style={[styles.addImageText, { color: colors.primary }]}>Add Image</Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              <View style={styles.imageRow}>
                {images.map((img) => (
                  <ImageThumbnail
                    key={img.id}
                    img={img}
                    onRemove={() => removeImage(img.id)}
                    colors={colors}
                  />
                ))}
              </View>
            </ScrollView>
          )}

        </View>

        {/* Revision Settings */}
        <View style={styles.field}>
          <IntervalPicker intervals={intervals} onChange={setIntervals} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImageThumbnail({
  img,
  onRemove,
  colors,
}: {
  img: NoteImage;
  onRemove: () => void;
  colors: any;
}) {
  return (
    <View style={styles.imageWrapper}>
      <Image
        source={{ uri: img.uri }}
        style={[styles.imageThumbnail, { borderRadius: colors.radius - 4 }]}
        resizeMode="cover"
      />
      <TouchableOpacity
        onPress={onRemove}
        style={[styles.removeImageBtn, { backgroundColor: colors.destructive }]}
      >
        <Feather name="x" size={10} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, textAlign: "center" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7 },
  saveBtnText: { fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 20 },
  field: { gap: 8 },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: { fontSize: 13 },
  titleInput: { fontSize: 20, paddingVertical: 8, borderBottomWidth: 1 },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7 },
  categoryChipText: { fontSize: 13 },
  contentInput: {
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    lineHeight: 22,
    borderWidth: 1,
  },
  addImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  addImageText: { fontSize: 13 },
  imageScroll: { marginTop: 4 },
  imageRow: { flexDirection: "row", gap: 8 },
  imageWrapper: { position: "relative" },
  imageThumbnail: { width: 80, height: 80 },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: { gap: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 12 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#DC2626",
    lineHeight: 18,
  },
});
