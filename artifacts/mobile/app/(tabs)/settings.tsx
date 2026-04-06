import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  cancelAllRevisionNotifications,
  formatTime,
  getNotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  scheduleDailyRevisionReminder,
} from "@/lib/notifications";

const CATEGORY_COLORS = [
  "#4f46e5", "#10b981", "#f59e0b", "#ec4899",
  "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4",
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { categories, addCategory, removeCategory, notes, dueNotes } = useApp();
  const [newCatName, setNewCatName] = useState("");
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [showAddCat, setShowAddCat] = useState(false);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifHour, setNotifHour] = useState(9);
  const [notifMinute, setNotifMinute] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    getNotificationSettings().then(({ enabled, hour, minute }) => {
      setNotifEnabled(enabled);
      setNotifHour(hour);
      setNotifMinute(minute);
    });
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Push notifications require the native app installed via Expo Go or a device build.");
      return;
    }
    setNotifLoading(true);
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            "Permission required",
            "Please allow notifications in your device settings to receive revision reminders."
          );
          setNotifLoading(false);
          return;
        }
        await saveNotificationSettings(true, notifHour, notifMinute);
        await scheduleDailyRevisionReminder(notifHour, notifMinute, dueNotes.length);
        setNotifEnabled(true);
      } else {
        await saveNotificationSettings(false, notifHour, notifMinute);
        await cancelAllRevisionNotifications();
        setNotifEnabled(false);
      }
    } finally {
      setNotifLoading(false);
    }
  };

  const handleChangeHour = (delta: number) => {
    const newHour = (notifHour + delta + 24) % 24;
    setNotifHour(newHour);
    if (notifEnabled) {
      saveNotificationSettings(true, newHour, notifMinute);
      scheduleDailyRevisionReminder(newHour, notifMinute, dueNotes.length);
    }
  };

  const handleChangeMinute = (delta: number) => {
    const newMinute = (notifMinute + delta + 60) % 60;
    setNotifMinute(newMinute);
    if (notifEnabled) {
      saveNotificationSettings(true, notifHour, newMinute);
      scheduleDailyRevisionReminder(notifHour, newMinute, dueNotes.length);
    }
  };

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

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={[styles.notifCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.notifRow}>
            <View style={styles.notifLeft}>
              <View style={[styles.notifIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="bell" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.notifLabel, { color: colors.foreground }]}>Daily Reminders</Text>
                <Text style={[styles.notifSub, { color: colors.mutedForeground }]}>
                  {notifEnabled ? `Remind at ${formatTime(notifHour, notifMinute)}` : "Tap to enable"}
                </Text>
              </View>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleNotifications}
              disabled={notifLoading}
              trackColor={{ false: colors.muted, true: colors.primary + "80" }}
              thumbColor={notifEnabled ? colors.primary : colors.mutedForeground}
            />
          </View>

          {notifEnabled && Platform.OS !== "web" && (
            <>
              <View style={[styles.notifDivider, { backgroundColor: colors.border }]} />
              <View style={styles.timePicker}>
                <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>Reminder time</Text>
                <View style={styles.timeControls}>
                  <View style={styles.timeUnit}>
                    <TouchableOpacity onPress={() => handleChangeHour(1)} style={[styles.timeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                      <Feather name="chevron-up" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: colors.foreground }]}>
                      {notifHour.toString().padStart(2, "0")}
                    </Text>
                    <TouchableOpacity onPress={() => handleChangeHour(-1)} style={[styles.timeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                      <Feather name="chevron-down" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.timeSep, { color: colors.foreground }]}>:</Text>
                  <View style={styles.timeUnit}>
                    <TouchableOpacity onPress={() => handleChangeMinute(5)} style={[styles.timeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                      <Feather name="chevron-up" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: colors.foreground }]}>
                      {notifMinute.toString().padStart(2, "0")}
                    </Text>
                    <TouchableOpacity onPress={() => handleChangeMinute(-5)} style={[styles.timeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                      <Feather name="chevron-down" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.ampm, { color: colors.mutedForeground }]}>
                    {notifHour >= 12 ? "PM" : "AM"}
                  </Text>
                </View>
              </View>
              <View style={[styles.notifDivider, { backgroundColor: colors.border }]} />
              <View style={[styles.notifHint, { backgroundColor: colors.primary + "10" }]}>
                <Feather name="info" size={13} color={colors.primary} />
                <Text style={[styles.notifHintText, { color: colors.primary }]}>
                  You'll get a daily reminder at {formatTime(notifHour, notifMinute)} with how many cards are due.
                </Text>
              </View>
            </>
          )}

          {Platform.OS === "web" && (
            <>
              <View style={[styles.notifDivider, { backgroundColor: colors.border }]} />
              <View style={[styles.notifHint, { backgroundColor: colors.warning + "15" }]}>
                <Feather name="smartphone" size={13} color={colors.warning} />
                <Text style={[styles.notifHintText, { color: colors.warning }]}>
                  Install via Expo Go on your phone to receive push notifications.
                </Text>
              </View>
            </>
          )}
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
  notifCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  notifRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  notifLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  notifIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  notifSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  notifDivider: { height: 1 },
  timePicker: { padding: 14, gap: 10 },
  timeLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  timeControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeUnit: { alignItems: "center", gap: 6 },
  timeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  timeValue: { fontSize: 24, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "center" },
  timeSep: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  ampm: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginLeft: 4, marginBottom: 4 },
  notifHint: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12 },
  notifHintText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
