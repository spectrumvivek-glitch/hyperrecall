import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { NoteImage, generateId } from "@/lib/storage";

export default function NoteDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes, categories, revisionPlans, editNote, removeNote } = useApp();

  const note = notes.find((n) => n.id === id);
  const plan = revisionPlans.find((p) => p.noteId === id);
  const category = categories.find((c) => c.id === note?.categoryId);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [selectedCategory, setSelectedCategory] = useState(note?.categoryId || "");
  const [images, setImages] = useState<NoteImage[]>(note?.images || []);
  const [intervals, setIntervals] = useState<number[]>(plan?.intervals || [1, 3, 7, 15, 30]);
  const [isSaving, setIsSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setSelectedCategory(note.categoryId);
      setImages(note.images);
    }
    if (plan) setIntervals(plan.intervals);
  }, [note, plan]);

  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.mutedForeground }}>Note not found</Text>
      </View>
    );
  }

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const newImages: NoteImage[] = result.assets.map((asset) => ({
        id: generateId(),
        noteId: id || "",
        uri: asset.uri,
        thumbnailUri: asset.uri,
      }));
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleSave = async () => {
    if (title.trim().length === 0) return;
    setIsSaving(true);
    try {
      await editNote(
        id!,
        { title: title.trim(), content: content.trim(), categoryId: selectedCategory, images },
        intervals
      );
      setIsEditing(false);
    } catch {
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${note.title}"?`)) {
        removeNote(id!);
        router.back();
      }
    } else {
      Alert.alert(
        "Delete Note",
        `Are you sure you want to delete "${note.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await removeNote(id!);
              router.back();
            },
          },
        ]
      );
    }
  };

  const daysUntilDue = plan
    ? Math.ceil((plan.nextRevisionDate - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {isEditing ? "Edit Note" : note.title}
        </Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                {isSaving ? "..." : "Save"}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerBtn} activeOpacity={0.7}>
                <Feather name="edit-2" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerBtn} activeOpacity={0.7}>
                <Feather name="trash-2" size={20} color={colors.destructive} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Meta info */}
        {!isEditing && (
          <View style={styles.meta}>
            {category && (
              <View style={[styles.categoryBadge, { backgroundColor: category.color + "20", borderRadius: colors.radius / 2 }]}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Text style={[styles.categoryText, { color: category.color }]}>{category.name}</Text>
              </View>
            )}
            {plan && (
              <View style={[styles.dueBadge, { backgroundColor: colors.muted, borderRadius: colors.radius / 2 }]}>
                <Feather name="clock" size={12} color={colors.mutedForeground} />
                <Text style={[styles.dueText, { color: colors.mutedForeground }]}>
                  {daysUntilDue !== null && daysUntilDue <= 0
                    ? "Due today"
                    : `Due in ${daysUntilDue}d`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Title */}
        {isEditing ? (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.border, fontFamily: "Inter_600SemiBold" }]}
            />
          </View>
        ) : (
          <Text style={[styles.noteTitle, { color: colors.foreground }]}>{note.title}</Text>
        )}

        {/* Images */}
        {isEditing ? (
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Images ({images.length})</Text>
              <TouchableOpacity onPress={pickImage} style={[styles.addImageBtn, { borderColor: colors.primary, borderRadius: colors.radius / 2 }]} activeOpacity={0.7}>
                <Feather name="image" size={14} color={colors.primary} />
                <Text style={[styles.addImageText, { color: colors.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imageRow}>
                  {images.map((img) => (
                    <View key={img.id} style={styles.imageWrapper}>
                      <Image source={{ uri: img.uri }} style={[styles.imageThumbnail, { borderRadius: colors.radius - 4 }]} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => setImages((prev) => prev.filter((i) => i.id !== img.id))}
                        style={[styles.removeImageBtn, { backgroundColor: colors.destructive }]}
                      >
                        <Feather name="x" size={10} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        ) : (
          note.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={styles.imageRow}>
                {note.images.map((img) => (
                  <Image key={img.id} source={{ uri: img.uri }} style={[styles.noteImage, { borderRadius: colors.radius }]} resizeMode="cover" />
                ))}
              </View>
            </ScrollView>
          )
        )}

        {/* Content */}
        {isEditing ? (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Content</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              style={[styles.contentInput, { color: colors.foreground, backgroundColor: colors.muted, borderRadius: colors.radius, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
            />
          </View>
        ) : (
          note.content.length > 0 && (
            <Text style={[styles.noteContent, { color: colors.foreground }]}>{note.content}</Text>
          )
        )}

        {/* Revision plan */}
        {isEditing ? (
          <View style={styles.field}>
            <IntervalPicker intervals={intervals} onChange={setIntervals} />
          </View>
        ) : (
          plan && (
            <View style={[styles.planCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 }]}>
              <Text style={[styles.planTitle, { color: colors.foreground }]}>Revision Plan</Text>
              <View style={styles.intervalDisplay}>
                {plan.intervals.map((d, i) => (
                  <View
                    key={i}
                    style={[
                      styles.intervalChip,
                      {
                        borderRadius: colors.radius / 2,
                        backgroundColor: i === plan.currentStep ? colors.primary : colors.accent,
                      },
                    ]}
                  >
                    <Text style={[styles.intervalChipText, { color: i === plan.currentStep ? colors.primaryForeground : colors.accentForeground }]}>
                      {d}d
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.planSub, { color: colors.mutedForeground }]}>
                Step {plan.currentStep + 1} of {plan.intervals.length}
              </Text>
            </View>
          )
        )}

        {/* Category picker (edit mode) */}
        {isEditing && (
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
                      style={[styles.categoryChip, { borderRadius: colors.radius / 2, backgroundColor: isSelected ? cat.color : cat.color + "15", borderColor: cat.color + "40", borderWidth: 1 }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.categoryChipText, { color: isSelected ? "#fff" : cat.color }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center", marginHorizontal: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  meta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dueBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  dueText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  noteTitle: { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 32 },
  noteContent: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  noteImage: { width: 200, height: 150, marginRight: 8 },
  field: { gap: 8 },
  fieldHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  titleInput: { fontSize: 20, paddingVertical: 8, borderBottomWidth: 1 },
  contentInput: { padding: 12, minHeight: 100, fontSize: 14, lineHeight: 22, borderWidth: 1 },
  addImageBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  addImageText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  imageRow: { flexDirection: "row", gap: 8 },
  imageWrapper: { position: "relative" },
  imageThumbnail: { width: 80, height: 80 },
  removeImageBtn: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  planCard: { padding: 14, gap: 10 },
  planTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  intervalDisplay: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  intervalChip: { paddingHorizontal: 10, paddingVertical: 5 },
  intervalChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  planSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7 },
  categoryChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
