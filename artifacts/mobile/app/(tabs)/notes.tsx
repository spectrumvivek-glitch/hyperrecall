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

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notes, categories, revisionPlans } = useApp();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch =
        search.length === 0 ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCategory || n.categoryId === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [notes, search, selectedCategory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Notes</Text>
        <TouchableOpacity
          onPress={() => router.push("/add-note")}
          style={[
            styles.addBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.muted,
              borderRadius: colors.radius,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        data={[{ id: null, name: "All", color: colors.primary }, ...categories]}
        keyExtractor={(item) => item.id || "all"}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilter}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item.id;
          return (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item.id)}
              style={[
                styles.categoryChip,
                {
                  borderRadius: colors.radius / 2,
                  backgroundColor: isSelected ? item.color : item.color + "15",
                  borderColor: item.color + "40",
                  borderWidth: 1,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: isSelected ? "#fff" : item.color },
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={[styles.categoryList, { borderBottomColor: colors.border }]}
      />

      {/* Notes list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              (Platform.OS === "web" ? 34 : insets.bottom) + 100,
          },
        ]}
        renderItem={({ item }) => {
          const plan = revisionPlans.find((p) => p.noteId === item.id);
          return (
            <NoteCard
              note={item}
              plan={plan}
              onPress={() =>
                router.push({ pathname: "/note-detail", params: { id: item.id } })
              }
              showDueBadge
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title="No notes found"
            description={
              search.length > 0
                ? `No notes match "${search}"`
                : "Create your first note to get started"
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  categoryList: {
    borderBottomWidth: 1,
  },
  categoryFilter: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    padding: 12,
  },
});
