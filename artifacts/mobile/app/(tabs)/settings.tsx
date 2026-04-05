import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_COLORS = [
  "#4f46e5", "#10b981", "#f59e0b", "#ec4899",
  "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4",
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { categories, addCategory, removeCategory, notes } = useApp();
  const [newCatName, setNewCatName] = useState("");
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [showAddCat, setShowAddCat] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleAddCategory = async () => {
    if (newCatName.trim().length === 0) return;
    await addCategory(newCatName.trim(), selectedColor);
    setNewCatName("");
    setShowAddCat(false);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    const noteCount = notes.filter((n) => n.categoryId === id).length;
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${name}"? ${noteCount > 0 ? `${noteCount} notes will become uncategorized.` : ""}`)) {
        removeCategory(id);
      }
    } else {
      Alert.alert(
        `Delete "${name}"?`,
        noteCount > 0 ? `${noteCount} notes will become uncategorized.` : "This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => removeCategory(id) },
        ]
      );
    }
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      {/* Categories Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Categories
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddCat(!showAddCat)}
            style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}
            activeOpacity={0.8}
          >
            <Feather name={showAddCat ? "x" : "plus"} size={16} color={colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
              {showAddCat ? "Cancel" : "Add"}
            </Text>
          </TouchableOpacity>
        </View>

        {showAddCat && (
          <View
            style={[
              styles.addCatForm,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <TextInput
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Category name"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.catInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.muted,
                  borderRadius: colors.radius / 2,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            />
            <View style={styles.colorRow}>
              {CATEGORY_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorDotSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  {selectedColor === c && (
                    <Feather name="check" size={12} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleAddCategory}
              style={[
                styles.createBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius / 2 },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
                Create Category
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.catList}>
          {categories.map((cat) => {
            const noteCount = notes.filter((n) => n.categoryId === cat.id).length;
            return (
              <View
                key={cat.id}
                style={[
                  styles.catRow,
                  {
                    backgroundColor: colors.card,
                    borderRadius: colors.radius,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={styles.catLeft}>
                  <View
                    style={[styles.catColorIndicator, { backgroundColor: cat.color }]}
                  />
                  <View>
                    <Text style={[styles.catName, { color: colors.foreground }]}>
                      {cat.name}
                    </Text>
                    <Text style={[styles.catCount, { color: colors.mutedForeground }]}>
                      {noteCount} note{noteCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteCategory(cat.id, cat.name)}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.infoRow}>
            <Feather name="book" size={18} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.foreground }]}>StudyBrain</Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>v1.0.0</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Feather name="database" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.foreground }]}>Notes stored</Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>{notes.length}</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Feather name="shield" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.foreground }]}>Data storage</Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>Local only</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 24 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  addCatForm: { padding: 14, gap: 12 },
  catInput: {
    padding: 12,
    fontSize: 14,
  },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  createBtn: { paddingVertical: 12, alignItems: "center" },
  createBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  catList: { gap: 8 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  catLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  catColorIndicator: { width: 16, height: 36, borderRadius: 4 },
  catName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  catCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  deleteBtn: { padding: 8 },
  infoCard: { overflow: "hidden" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  infoDivider: { height: 1, marginLeft: 44 },
});
