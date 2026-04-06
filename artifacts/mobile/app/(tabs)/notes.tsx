import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
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

type SortKey = "updated" | "title" | "due";

const SORT_OPTIONS: { key: SortKey; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "updated", label: "Recent", icon: "clock" },
  { key: "title", label: "A–Z", icon: "type" },
  { key: "due", label: "Due", icon: "refresh-cw" },
];

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notes, categories, revisionPlans, dueNotes } = useApp();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("updated");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const getCatNoteCount = (catId: string | null) =>
    catId === null ? notes.length : notes.filter((n) => n.categoryId === catId).length;

  const filtered = useMemo(() => {
    let list = notes.filter((n) => {
      const matchSearch =
        search.length === 0 ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCategory || n.categoryId === selectedCategory;
      return matchSearch && matchCat;
    });

    if (sortKey === "updated") list = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
    else if (sortKey === "title") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (sortKey === "due") {
      list = [...list].sort((a, b) => {
        const pa = revisionPlans.find((p) => p.noteId === a.id);
        const pb = revisionPlans.find((p) => p.noteId === b.id);
        return (pa?.nextRevisionDate ?? Infinity) - (pb?.nextRevisionDate ?? Infinity);
      });
    }
    return list;
  }, [notes, search, selectedCategory, sortKey, revisionPlans]);

  const dueCount = dueNotes.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 14, backgroundColor: colors.background }]}>
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
          <Feather name="plus" size={18} color={colors.primaryForeground} />
          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>New</Text>
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
        data={[{ id: null, name: "All", color: colors.primary }, ...categories]}
        keyExtractor={(item) => item.id ?? "all"}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={[styles.chipList, { backgroundColor: colors.background }]}
        renderItem={({ item }) => {
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
              activeOpacity={0.7}
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

      {/* Sort row */}
      <View style={[styles.sortRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>Sort:</Text>
        <View style={styles.sortOptions}>
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortKey(opt.key)}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor: active ? colors.primary + "15" : "transparent",
                    borderColor: active ? colors.primary + "40" : "transparent",
                  },
                ]}
                activeOpacity={0.7}
              >
                <Feather name={opt.icon} size={11} color={active ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.sortChipText, { color: active ? colors.primary : colors.mutedForeground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Notes list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 100 },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  chipList: {},
  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chipCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  chipCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  sortLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sortOptions: { flexDirection: "row", gap: 6 },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
});
