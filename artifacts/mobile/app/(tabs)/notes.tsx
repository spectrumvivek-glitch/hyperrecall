import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { NoteCard } from "@/components/NoteCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { showProGate } from "@/lib/proGate";
import { useSubscription } from "@/lib/revenuecat";

const CATEGORY_COLORS = [
  "#4f46e5", "#10b981", "#f59e0b", "#ec4899",
  "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4",
];

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notes, categories, revisionPlans, dueNotes, addCategory } = useApp();
  const { isPro } = useSubscription();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [savingCat, setSavingCat] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const getCatNoteCount = (catId: string | null) =>
    catId === null ? notes.length : notes.filter((n) => n.categoryId === catId).length;

  const filtered = useMemo(() => {
    const list = notes.filter((n) => {
      const matchSearch =
        search.length === 0 ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCategory || n.categoryId === selectedCategory;
      return matchSearch && matchCat;
    });
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, search, selectedCategory]);

  const dueCount = dueNotes.length;

  const openAddCat = () => {
    if (!isPro) {
      showProGate(
        "Free trial ended",
        "Your 30-day free trial has ended. Upgrade to HyperRecall Pro to create new categories.",
      );
      return;
    }
    setNewCatName("");
    setNewCatColor(CATEGORY_COLORS[0]);
    setShowAddCat(true);
  };

  const handleSaveCat = async () => {
    const name = newCatName.trim();
    if (name.length === 0) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert("Already exists", "A category with this name already exists.");
      return;
    }
    try {
      setSavingCat(true);
      const cat = await addCategory(name, newCatColor);
      setShowAddCat(false);
      setNewCatName("");
      // Auto-select the freshly created category so the user sees the result.
      setSelectedCategory(cat.id);
    } finally {
      setSavingCat(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 18, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Notes</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {notes.length} note{notes.length !== 1 ? "s" : ""}
            {dueCount > 0 ? ` · ${dueCount} due` : ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/add-note")}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        data={[
          { id: null, name: "All", color: colors.primary },
          ...categories,
          { id: "__add__", name: "Add", color: colors.primary },
        ]}
        keyExtractor={(item) => item.id ?? "all"}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={[styles.chipList, { backgroundColor: colors.background }]}
        nestedScrollEnabled
        renderItem={({ item }) => {
          if (item.id === "__add__") {
            return (
              <TouchableOpacity
                onPress={openAddCat}
                style={[
                  styles.chip,
                  styles.addChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={14} color={colors.primary} />
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  Add
                </Text>
              </TouchableOpacity>
            );
          }
          const isSelected = selectedCategory === item.id;
          const count = getCatNoteCount(item.id);
          return (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? item.color : colors.card,
                  borderColor: isSelected ? item.color : colors.border,
                },
              ]}
              activeOpacity={0.75}
            >
              {!isSelected && (
                <View style={[styles.chipDot, { backgroundColor: item.color }]} />
              )}
              <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                {item.name}
              </Text>
              <View style={[
                styles.chipCount,
                { backgroundColor: isSelected ? "#ffffff30" : colors.muted },
              ]}>
                <Text style={[styles.chipCountText, { color: isSelected ? "#fff" : colors.mutedForeground }]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Notes list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 110 },
        ]}
        renderItem={({ item }) => {
          const plan = revisionPlans.find((p) => p.noteId === item.id);
          return (
            <NoteCard
              note={item}
              plan={plan}
              onPress={() => router.push({ pathname: "/note-detail", params: { id: item.id } })}
              showDueBadge
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title={search.length > 0 ? "No results" : "No notes yet"}
            description={
              search.length > 0
                ? `Nothing matches "${search}". Try a different keyword.`
                : "Create your first note and start a revision schedule."
            }
            actionLabel={search.length === 0 ? "Create Note" : undefined}
            onAction={search.length === 0 ? () => router.push("/add-note") : undefined}
          />
        }
      />

      {/* Add Category Modal */}
      <Modal
        visible={showAddCat}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCat(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAddCat(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalCenterWrap}
          >
            <Pressable
              onPress={() => {}}
              style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Category</Text>
                <TouchableOpacity
                  onPress={() => setShowAddCat(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="e.g. Biology"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                autoFocus
                maxLength={32}
                returnKeyType="done"
                onSubmitEditing={handleSaveCat}
              />

              <Text style={[styles.modalLabel, { color: colors.mutedForeground, marginTop: 14 }]}>
                Color
              </Text>
              <View style={styles.colorRow}>
                {CATEGORY_COLORS.map((c) => {
                  const selected = c === newCatColor;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setNewCatColor(c)}
                      style={[
                        styles.colorSwatch,
                        {
                          backgroundColor: c,
                          borderColor: selected ? colors.foreground : "transparent",
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      {selected && <Feather name="check" size={14} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowAddCat(false)}
                  style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveCat}
                  disabled={savingCat || newCatName.trim().length === 0}
                  style={[
                    styles.modalBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: savingCat || newCatName.trim().length === 0 ? 0.5 : 1,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    {savingCat ? "Adding..." : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  searchWrap: { paddingHorizontal: 18, paddingBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  chipList: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 56,
  },
  chipRow: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  addChip: {
    borderStyle: "dashed",
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 13, fontWeight: "600" },
  chipCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  chipCountText: { fontSize: 11, fontWeight: "800" },
  listContent: { paddingHorizontal: 18, paddingTop: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalCenterWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalLabel: { fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { fontSize: 14, fontWeight: "700" },
});
