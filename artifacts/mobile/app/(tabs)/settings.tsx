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
import {
  activateHolidayRest,
  activateVacation,
  deactivateVacation,
  formatDate,
  startOfDay,
} from "@/lib/storage";

const CATEGORY_COLORS = [
  "#4f46e5", "#10b981", "#f59e0b", "#ec4899",
  "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4",
];

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: 14, borderColor: colors.border, borderWidth: 1, overflow: "hidden" }, style]}>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { categories, addCategory, removeCategory, notes, dueNotes, vacationSettings, refreshVacation } = useApp();
  const [newCatName, setNewCatName] = useState("");
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [showAddCat, setShowAddCat] = useState(false);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifHour, setNotifHour] = useState(9);
  const [notifMinute, setNotifMinute] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  // Vacation mode state
  const [vacLoading, setVacLoading] = useState(false);
  const [vacStartText, setVacStartText] = useState("");
  const [vacEndText, setVacEndText] = useState("");
  const [showVacForm, setShowVacForm] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [holidayDateText, setHolidayDateText] = useState(todayStr);

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
          Alert.alert("Permission required", "Please allow notifications in your device settings.");
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

  // Vacation mode handlers
  const parseDate = (text: string): number | null => {
    const d = new Date(text);
    if (isNaN(d.getTime())) return null;
    return startOfDay(d.getTime());
  };

  const handleActivateVacation = async () => {
    const start = parseDate(vacStartText);
    const end = parseDate(vacEndText);
    if (!start || !end) {
      Alert.alert("Invalid dates", "Please enter dates in YYYY-MM-DD format.");
      return;
    }
    if (end <= start) {
      Alert.alert("Invalid range", "End date must be after start date.");
      return;
    }
    const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    Alert.alert(
      "Activate Vacation Mode?",
      `All your revision dates will be shifted forward by ${days} day${days !== 1 ? "s" : ""}. Your streak will be protected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate",
          onPress: async () => {
            setVacLoading(true);
            try {
              await activateVacation(start, end);
              await refreshVacation();
              setShowVacForm(false);
              setVacStartText("");
              setVacEndText("");
              Alert.alert("Vacation Mode On", "Your revision schedule has been shifted. Enjoy your break!");
            } finally {
              setVacLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeactivateVacation = async () => {
    Alert.alert("Deactivate Vacation Mode?", "Your revised schedule will remain as shifted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        onPress: async () => {
          setVacLoading(true);
          try {
            await deactivateVacation();
            await refreshVacation();
          } finally {
            setVacLoading(false);
          }
        },
      },
    ]);
  };

  const handleHolidayRest = async () => {
    const parts = holidayDateText.trim().split("-");
    if (parts.length !== 3 || parts.some((p) => isNaN(Number(p)))) {
      Alert.alert("Invalid Date", "Please enter a valid date in YYYY-MM-DD format.");
      return;
    }
    const restTs = new Date(`${holidayDateText}T00:00:00`).getTime();
    if (isNaN(restTs)) {
      Alert.alert("Invalid Date", "Please enter a valid date in YYYY-MM-DD format.");
      return;
    }
    const restLabel = new Date(restTs).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const nextDayLabel = new Date(restTs + 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    Alert.alert(
      "Holiday Rest Mode",
      `Cards scheduled for ${restLabel} will be pushed to ${nextDayLabel}. Your streak is protected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Rest Day",
          onPress: async () => {
            setHolidayLoading(true);
            try {
              await activateHolidayRest(restTs);
              await refreshVacation();
              Alert.alert("Rest Day Set", `Cards for ${restLabel} are moved to ${nextDayLabel}. Enjoy your break!`);
            } finally {
              setHolidayLoading(false);
            }
          },
        },
      ]
    );
  };

  const divider = (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  );

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Categories</Text>
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
          <SectionCard>
            <View style={{ padding: 14, gap: 12 }}>
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="Category name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.catInput, { color: colors.foreground, backgroundColor: colors.muted, borderRadius: colors.radius / 2 }]}
              />
              <View style={styles.colorRow}>
                {CATEGORY_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                    activeOpacity={0.8}
                  >
                    {selectedColor === c && <Feather name="check" size={12} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={handleAddCategory} style={[styles.createBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]} activeOpacity={0.8}>
                <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>Create Category</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        )}

        <SectionCard>
          {categories.map((cat, i) => {
            const noteCount = notes.filter((n) => n.categoryId === cat.id).length;
            return (
              <React.Fragment key={cat.id}>
                {i > 0 && divider}
                <View style={styles.catRow}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catColorBar, { backgroundColor: cat.color }]} />
                    <View>
                      <Text style={[styles.catName, { color: colors.foreground }]}>{cat.name}</Text>
                      <Text style={[styles.catCount, { color: colors.mutedForeground }]}>
                        {noteCount} note{noteCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)} style={styles.deleteBtn} activeOpacity={0.7}>
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            );
          })}
          {categories.length === 0 && (
            <View style={styles.emptyCats}>
              <Text style={[styles.emptyCatsText, { color: colors.mutedForeground }]}>No categories yet</Text>
            </View>
          )}
        </SectionCard>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notifications</Text>
        <SectionCard>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="bell" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Daily Reminders</Text>
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                {notifEnabled ? `Remind at ${formatTime(notifHour, notifMinute)}` : "Tap to enable"}
              </Text>
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
              {divider}
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>Reminder time</Text>
                <View style={styles.timeControls}>
                  <View style={styles.timeUnit}>
                    <TouchableOpacity onPress={() => handleChangeHour(1)} style={[styles.timeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                      <Feather name="chevron-up" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: colors.foreground }]}>{notifHour.toString().padStart(2, "0")}</Text>
                    <TouchableOpacity onPress={() => handleChangeHour(-1)} style={[styles.timeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                      <Feather name="chevron-down" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.timeSep, { color: colors.foreground }]}>:</Text>
                  <View style={styles.timeUnit}>
                    <TouchableOpacity onPress={() => handleChangeMinute(5)} style={[styles.timeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                      <Feather name="chevron-up" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: colors.foreground }]}>{notifMinute.toString().padStart(2, "0")}</Text>
                    <TouchableOpacity onPress={() => handleChangeMinute(-5)} style={[styles.timeBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
                      <Feather name="chevron-down" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.ampm, { color: colors.mutedForeground }]}>{notifHour >= 12 ? "PM" : "AM"}</Text>
                </View>
              </View>
            </>
          )}

          {Platform.OS === "web" && (
            <>
              {divider}
              <View style={[styles.hintRow, { backgroundColor: colors.warning + "12" }]}>
                <Feather name="smartphone" size={13} color={colors.warning} />
                <Text style={[styles.hintText, { color: colors.warning }]}>
                  Install via Expo Go on your phone to receive push notifications.
                </Text>
              </View>
            </>
          )}
        </SectionCard>
      </View>

      {/* Vacation & Rest Mode */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Breaks & Rest</Text>
        </View>

        {/* Vacation Mode */}
        <SectionCard>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: "#3b82f6" + "18" }]}>
              <Feather name="umbrella" size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Vacation Mode</Text>
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                {vacationSettings.isActive
                  ? `Active · returns ${formatDate(vacationSettings.endDate)}`
                  : "Shift all reviews while you're away"}
              </Text>
            </View>
            {vacationSettings.isActive ? (
              <TouchableOpacity
                onPress={handleDeactivateVacation}
                disabled={vacLoading}
                style={[styles.smallBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.smallBtnText, { color: colors.destructive }]}>End</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setShowVacForm(!showVacForm)}
                style={[styles.smallBtn, { backgroundColor: "#3b82f6" + "15", borderColor: "#3b82f6" + "40" }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.smallBtnText, { color: "#3b82f6" }]}>{showVacForm ? "Cancel" : "Plan"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {showVacForm && !vacationSettings.isActive && (
            <>
              {divider}
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>Start date (YYYY-MM-DD)</Text>
                <TextInput
                  value={vacStartText}
                  onChangeText={setVacStartText}
                  placeholder="e.g. 2025-12-20"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.dateInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                />
                <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>End date (YYYY-MM-DD)</Text>
                <TextInput
                  value={vacEndText}
                  onChangeText={setVacEndText}
                  placeholder="e.g. 2026-01-05"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.dateInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                />
                <TouchableOpacity
                  onPress={handleActivateVacation}
                  disabled={vacLoading}
                  style={[styles.createBtn, { backgroundColor: "#3b82f6", borderRadius: colors.radius / 2, opacity: vacLoading ? 0.6 : 1 }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.createBtnText, { color: "#fff" }]}>
                    {vacLoading ? "Activating..." : "Activate Vacation Mode"}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.hintRow, { backgroundColor: "#3b82f6" + "12" }]}>
                  <Feather name="info" size={12} color="#3b82f6" />
                  <Text style={[styles.hintText, { color: "#3b82f6" }]}>
                    All your revision dates will shift forward by the vacation duration. Your streak is protected.
                  </Text>
                </View>
              </View>
            </>
          )}
        </SectionCard>

        {/* Holiday Rest Mode */}
        <SectionCard>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: "#f59e0b" + "18" }]}>
              <MaterialCommunityIcons name="weather-sunset" size={20} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Holiday Rest</Text>
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                Pick a day to skip — cards move to the next day
              </Text>
            </View>
          </View>
          <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Feather name="calendar" size={15} color="#f59e0b" />
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground, flex: 0 }]}>Rest day</Text>
              <TextInput
                value={holidayDateText}
                onChangeText={setHolidayDateText}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.catInput,
                  { flex: 1, color: colors.foreground, backgroundColor: colors.muted, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
                ]}
              />
            </View>
            <TouchableOpacity
              onPress={handleHolidayRest}
              disabled={holidayLoading}
              style={[
                styles.vacBtn,
                { backgroundColor: "#f59e0b", borderRadius: 10, opacity: holidayLoading ? 0.6 : 1 },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.vacBtnText, { color: "#fff" }]}>
                {holidayLoading ? "Applying…" : "Set Rest Day"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.hintRow, { backgroundColor: "#f59e0b" + "10", margin: 0, borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Feather name="info" size={12} color="#f59e0b" />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Only cards scheduled for that exact day are shifted. Overdue cards are unaffected.
            </Text>
          </View>
        </SectionCard>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
        <SectionCard>
          <View style={styles.infoRow}>
            <Feather name="zap" size={18} color={colors.primary} />
            <Text style={[styles.infoLabel, { color: colors.foreground }]}>Recallify</Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>v1.0.0</Text>
          </View>
          {divider}
          <View style={styles.infoRow}>
            <Feather name="database" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.foreground }]}>Notes stored</Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>{notes.length}</Text>
          </View>
          {divider}
          <View style={styles.infoRow}>
            <Feather name="shield" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.foreground }]}>Data storage</Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>Local only</Text>
          </View>
        </SectionCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 24 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  catInput: { padding: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  colorDotSelected: { borderWidth: 3, borderColor: "#ffffff" },
  createBtn: { paddingVertical: 12, alignItems: "center" },
  createBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  catRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  catLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  catColorBar: { width: 4, height: 36, borderRadius: 2 },
  catName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  catCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  deleteBtn: { padding: 8 },
  emptyCats: { padding: 16, alignItems: "center" },
  emptyCatsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  smallBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pickerLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  timeControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeUnit: { alignItems: "center", gap: 6 },
  timeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  timeValue: { fontSize: 24, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "center" },
  timeSep: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  ampm: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginLeft: 4, marginBottom: 4 },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12 },
  hintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  dateInput: { padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", borderRadius: 10, borderWidth: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
