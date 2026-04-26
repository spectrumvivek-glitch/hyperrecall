import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { PdfAttachmentCard } from "@/components/PdfAttachmentCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { deleteLocalImage } from "@/lib/imageUtils";
import { chooseImageSource } from "@/lib/imagePicker";
import { deleteLocalPdf, pickPdfFromDevice } from "@/lib/pdfPicker";
import { FREE_MAX_NOTES_PER_CATEGORY, showProGate } from "@/lib/proGate";
import { useSubscription } from "@/lib/revenuecat";
import { NoteAttachment, NoteImage } from "@/lib/storage";

export default function NoteDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes, categories, revisionPlans, editNote, removeNote } = useApp();
  const { isPro } = useSubscription();

  const note = notes.find((n) => n.id === id);
  const plan = revisionPlans.find((p) => p.noteId === id);
  const category = categories.find((c) => c.id === note?.categoryId);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [selectedCategory, setSelectedCategory] = useState(note?.categoryId || "");
  const [images, setImages] = useState<NoteImage[]>(note?.images || []);
  const [attachments, setAttachments] = useState<NoteAttachment[]>(note?.attachments || []);
  const [intervals, setIntervals] = useState<number[]>(plan?.intervals || [1, 3, 7, 15, 30]);
  const initialIntervals = useRef(plan?.intervals || []);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isWorking = isSaving;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setSelectedCategory(note.categoryId);
      setImages(note.images);
      setAttachments(note.attachments || []);
    }
    if (plan) {
      setIntervals(plan.intervals);
      initialIntervals.current = plan.intervals;
    }
  }, [note, plan]);

  if (!note) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: colors.mutedForeground }}>Note not found</Text>
      </View>
    );
  }

  const pickImage = async () => {
    const { images: picked, errorMessage } = await chooseImageSource();
    if (errorMessage) {
      setErrorMsg(errorMessage);
      return;
    }
    if (picked.length > 0) {
      setErrorMsg(null);
      const stamped = picked.map((img) => ({ ...img, noteId: id || "" }));
      setImages((prev) => [...prev, ...stamped]);
    }
  };

  const removeImageLocally = (imgId: string) => {
    setImages((prev) => prev.filter((i) => i.id !== imgId));
  };

  const pickPdf = async () => {
    const { attachments: picked, errorMessage } = await pickPdfFromDevice();
    if (errorMessage) {
      setErrorMsg(errorMessage);
      return;
    }
    if (picked.length > 0) {
      setErrorMsg(null);
      const stamped = picked.map((a) => ({ ...a, noteId: id || "" }));
      setAttachments((prev) => [...prev, ...stamped]);
    }
  };

  const removeAttachmentLocally = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (title.trim().length === 0) {
      setErrorMsg("Please enter a title for your note.");
      return;
    }
    setIsSaving(true);
    try {
      // Save FIRST so the user's edits are persisted even if cleanup of
      // removed files later fails (file deletion is a best-effort housekeep
      // task and must never block the save).
      const intervalsChanged =
        JSON.stringify(intervals) !== JSON.stringify(initialIntervals.current);
      await editNote(
        id!,
        {
          title: title.trim(),
          content: content.trim(),
          categoryId: selectedCategory,
          images: images,
          attachments: attachments,
        },
        intervalsChanged ? intervals : undefined
      );

      // Best-effort cleanup of files that were removed in this edit session.
      // Wrapped so any FS error never reaches the user.
      try {
        const originalUris = new Map(note.images.map((img) => [img.id, img.uri]));
        const remainingIds = new Set(images.map((img) => img.id));
        const removedUris = [...originalUris.entries()]
          .filter(([imgId]) => !remainingIds.has(imgId))
          .map(([, uri]) => uri);
        await Promise.all(
          removedUris.map((uri) => deleteLocalImage(uri).catch(() => {})),
        );

        const originalPdfUris = new Map(
          (note.attachments || []).map((a) => [a.id, a.uri]),
        );
        const remainingAttIds = new Set(attachments.map((a) => a.id));
        const removedPdfUris = [...originalPdfUris.entries()]
          .filter(([attId]) => !remainingAttIds.has(attId))
          .map(([, uri]) => uri);
        await Promise.all(
          removedPdfUris.map((uri) => deleteLocalPdf(uri).catch(() => {})),
        );
      } catch (cleanupErr) {
        console.warn("[note-detail] cleanup failed:", cleanupErr);
      }

      setIsEditing(false);
    } catch (err: any) {
      console.warn("[note-detail] save failed:", err);
      const detail =
        typeof err?.message === "string" && err.message.length > 0
          ? err.message
          : "Please try again.";
      setErrorMsg(`Failed to save changes. ${detail}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    const doDelete = async () => {
      // Delete all local image and PDF files
      await Promise.all(note.images.map((img) => deleteLocalImage(img.uri)));
      await Promise.all((note.attachments || []).map((a) => deleteLocalPdf(a.uri)));
      await removeNote(id!);
      router.back();
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${note.title}"?`)) doDelete();
    } else {
      Alert.alert("Delete Note", `Are you sure you want to delete "${note.title}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
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
              disabled={isWorking}
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius / 2, opacity: isWorking ? 0.6 : 1 },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                {isSaving ? "…" : "Save"}
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
        {errorMsg ? (
          <TouchableOpacity onPress={() => setErrorMsg(null)} activeOpacity={0.8} style={styles.errorBanner}>
            <Feather name="alert-circle" size={15} color="#DC2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Feather name="x" size={14} color="#DC2626" />
          </TouchableOpacity>
        ) : null}

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
                  {daysUntilDue !== null && daysUntilDue <= 0 ? "Due today" : `Due in ${daysUntilDue}d`}
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
              style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.border }]}
              editable={!isWorking}
            />
          </View>
        ) : (
          <Text style={[styles.noteTitle, { color: colors.foreground }]}>{note.title}</Text>
        )}

        {/* Images */}
        {isEditing ? (
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
                <Text style={[styles.addImageText, { color: colors.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imageRow}>
                  {images.map((img) => (
                    <EditableImage
                      key={img.id}
                      img={img}
                      onRemove={() => removeImageLocally(img.id)}
                      colors={colors}
                      disabled={isWorking}
                    />
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
                  <View key={img.id} style={{ position: "relative" }}>
                    <Image
                      source={{ uri: img.uri }}
                      style={[styles.noteImage, { borderRadius: colors.radius }]}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          )
        )}

        {/* PDFs */}
        {isEditing ? (
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                PDFs ({attachments.length})
              </Text>
              <TouchableOpacity
                onPress={pickPdf}
                disabled={isWorking}
                style={[styles.addImageBtn, { borderColor: colors.primary, borderRadius: colors.radius / 2 }]}
                activeOpacity={0.7}
              >
                <Feather name="file-text" size={14} color={colors.primary} />
                <Text style={[styles.addImageText, { color: colors.primary }]}>Add PDF</Text>
              </TouchableOpacity>
            </View>
            {attachments.length > 0 && (
              <View style={{ gap: 8 }}>
                {attachments.map((att) => (
                  <PdfAttachmentCard
                    key={att.id}
                    attachment={att}
                    onRemove={() => removeAttachmentLocally(att.id)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          (note.attachments?.length ?? 0) > 0 && (
            <View style={{ gap: 8 }}>
              {note.attachments!.map((att) => (
                <PdfAttachmentCard key={att.id} attachment={att} />
              ))}
            </View>
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
            <View
              style={[
                styles.planCard,
                { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <View style={styles.planTitleRow}>
                <Text style={[styles.planTitle, { color: colors.foreground }]}>Revision Plan</Text>
                <View style={[styles.modeBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                  <Feather name="sliders" size={11} color={colors.primary} />
                  <Text style={[styles.modeBadgeText, { color: colors.primary }]}>Custom Intervals</Text>
                </View>
              </View>
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
                    <Text
                      style={[
                        styles.intervalChipText,
                        { color: i === plan.currentStep ? colors.primaryForeground : colors.accentForeground },
                      ]}
                    >
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
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EditableImage({
  img,
  onRemove,
  colors,
  disabled,
}: {
  img: NoteImage;
  onRemove: () => void;
  colors: any;
  disabled: boolean;
}) {
  return (
    <View style={styles.imageWrapper}>
      <Image
        source={{ uri: img.uri }}
        style={[styles.imageThumbnail, { borderRadius: colors.radius - 4 }]}
        resizeMode="cover"
      />
      {!disabled && (
        <TouchableOpacity
          onPress={onRemove}
          style={[styles.removeImageBtn, { backgroundColor: colors.destructive }]}
        >
          <Feather name="x" size={10} color="#fff" />
        </TouchableOpacity>
      )}
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
  headerTitle: { flex: 1, fontSize: 16, textAlign: "center", marginHorizontal: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnText: { fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  meta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryText: { fontSize: 12 },
  dueBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  dueText: { fontSize: 12 },
  noteTitle: { fontSize: 24, lineHeight: 32 },
  noteContent: { fontSize: 15, lineHeight: 24 },
  noteImage: { width: 200, height: 150, marginRight: 8 },
  field: { gap: 8 },
  fieldHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontSize: 13 },
  titleInput: { fontSize: 20, paddingVertical: 8, borderBottomWidth: 1 },
  contentInput: { padding: 12, minHeight: 100, fontSize: 14, lineHeight: 22, borderWidth: 1 },
  addImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  addImageText: { fontSize: 13 },
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
  planCard: { padding: 14, gap: 10 },
  planTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planTitle: { fontSize: 14, fontWeight: "600" },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeBadgeText: { fontSize: 11, fontWeight: "600" },
  intervalDisplay: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  intervalChip: { paddingHorizontal: 10, paddingVertical: 5 },
  intervalChipText: { fontSize: 13 },
  planSub: { fontSize: 12 },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7 },
  categoryChipText: { fontSize: 13 },
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
