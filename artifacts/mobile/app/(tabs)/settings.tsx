import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useCloudNotes } from "@/lib/hooks/useCloudNotes";
import { useConnectionState } from "@/lib/hooks/useConnectionState";
import {
  cancelAllRevisionNotifications,
  formatTime,
  getNotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  scheduleDailyRevisionReminder,
} from "@/lib/notifications";
import { useSubscription } from "@/lib/revenuecat";

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
  const { categories, addCategory, removeCategory, renameCategory, notes, dueNotes } = useApp();
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const { user, signOut, isAuthenticating } = useAuth();
  const isOnline = useConnectionState();
  const router = useRouter();
  const { isPro, isAvailable: subAvailable, isLoading: subLoading } = useSubscription();
  const { notes: cloudNotes, isLoading: cloudLoading, error: cloudError } = useCloudNotes(user?.uid ?? null);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut().catch(() => {});
        },
      },
    ]);
  };
  const [newCatName, setNewCatName] = useState("");
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [showAddCat, setShowAddCat] = useState(false);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifHour, setNotifHour] = useState(9);
  const [notifMinute, setNotifMinute] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const divider = <View style={[styles.divider, { backgroundColor: colors.border }]} />;

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

  const handleStartRename = (id: string, name: string) => {
    setEditingCatId(id);
    setEditingCatName(name);
  };

  const handleSaveRename = async () => {
    if (!editingCatId) return;
    const trimmed = editingCatName.trim();
    if (trimmed.length === 0) {
      setEditingCatId(null);
      return;
    }
    await renameCategory(editingCatId, trimmed);
    setEditingCatId(null);
    setEditingCatName("");
  };

  const handleCancelRename = () => {
    setEditingCatId(null);
    setEditingCatName("");
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
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subscription</Text>
        <SectionCard>
          <TouchableOpacity
            onPress={() => router.push("/paywall")}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name={isPro ? "check-circle" : "zap"} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                {isPro ? "Recallify Pro" : "Upgrade to Recallify Pro"}
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                {isPro
                  ? "All Pro features unlocked"
                  : subLoading
                    ? "Loading plans…"
                    : subAvailable
                      ? "Unlimited notes, sync, analytics & more"
                      : "View plans"}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </SectionCard>
      </View>

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
                    {editingCatId === cat.id ? (
                      <TextInput
                        value={editingCatName}
                        onChangeText={setEditingCatName}
                        autoFocus
                        onSubmitEditing={handleSaveRename}
                        placeholder="Category name"
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.catInput, { color: colors.foreground, backgroundColor: colors.muted, borderRadius: colors.radius / 2, flex: 1 }]}
                      />
                    ) : (
                      <View>
                        <Text style={[styles.catName, { color: colors.foreground }]}>{cat.name}</Text>
                        <Text style={[styles.catCount, { color: colors.mutedForeground }]}>
                          {noteCount} note{noteCount !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                  {editingCatId === cat.id ? (
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <TouchableOpacity onPress={handleSaveRename} style={styles.deleteBtn} activeOpacity={0.7}>
                        <Feather name="check" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelRename} style={styles.deleteBtn} activeOpacity={0.7}>
                        <Feather name="x" size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <TouchableOpacity onPress={() => handleStartRename(cat.id, cat.name)} style={styles.deleteBtn} activeOpacity={0.7}>
                        <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)} style={styles.deleteBtn} activeOpacity={0.7}>
                        <Feather name="trash-2" size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  )}
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

      {/* Account */}
      {user && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>
            {/* Online / offline pill */}
            <View style={[styles.statusPill, { backgroundColor: isOnline ? "#22C55E18" : "#F59E0B18" }]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? "#22C55E" : "#F59E0B" }]} />
              <Text style={[styles.statusText, { color: isOnline ? "#22C55E" : "#F59E0B" }]}>
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
          <SectionCard>
            {/* User info */}
            <View style={styles.infoRow}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="user" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Signed in</Text>
                <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {user.displayName ? `${user.displayName} · ${user.email}` : user.email}
                </Text>
              </View>
            </View>
            {divider}
            {/* Cloud sync status */}
            <View style={styles.infoRow}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name={cloudLoading ? "loader" : cloudError ? "alert-circle" : "cloud"} size={18} color={cloudError ? colors.warning : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Cloud sync</Text>
                <Text style={[styles.settingSubtitle, { color: cloudError ? colors.warning : colors.mutedForeground }]}>
                  {cloudLoading
                    ? "Connecting…"
                    : cloudError
                    ? cloudError
                    : `${cloudNotes.length} note${cloudNotes.length !== 1 ? "s" : ""} synced`}
                </Text>
              </View>
            </View>
            {divider}
            {/* Sign out */}
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.infoRow}
              activeOpacity={0.7}
              disabled={isAuthenticating}
            >
              <View style={[styles.settingIcon, { backgroundColor: "#EF444418" }]}>
                {isAuthenticating
                  ? <ActivityIndicator size="small" color="#EF4444" />
                  : <Feather name="log-out" size={18} color="#EF4444" />}
              </View>
              <Text style={[styles.settingLabel, { color: "#EF4444" }]}>
                {isAuthenticating ? "Signing out…" : "Sign Out"}
              </Text>
            </TouchableOpacity>
          </SectionCard>
        </View>
      )}

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
            <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>Firebase + Local</Text>
          </View>
        </SectionCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 24 },
  title: { fontSize: 24 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17 },
  divider: { height: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 13 },
  catInput: { padding: 12, fontSize: 14 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  colorDotSelected: { borderWidth: 3, borderColor: "#ffffff" },
  createBtn: { paddingVertical: 12, alignItems: "center" },
  createBtnText: { fontSize: 15 },
  catRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  catLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  catColorBar: { width: 4, height: 36, borderRadius: 2 },
  catName: { fontSize: 15 },
  catCount: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  emptyCats: { padding: 16, alignItems: "center" },
  emptyCatsText: { fontSize: 14 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontSize: 15 },
  settingSubtitle: { fontSize: 12, marginTop: 2 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  smallBtnText: { fontSize: 13 },
  pickerLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  timeControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeUnit: { alignItems: "center", gap: 6 },
  timeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  timeValue: { fontSize: 24, minWidth: 36, textAlign: "center" },
  timeSep: { fontSize: 24, marginBottom: 4 },
  ampm: { fontSize: 16, marginLeft: 4, marginBottom: 4 },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18 },
  dateInput: { padding: 12, fontSize: 14, borderRadius: 10, borderWidth: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoLabel: { fontSize: 14, flex: 1 },
  infoValue: { fontSize: 14 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
});
