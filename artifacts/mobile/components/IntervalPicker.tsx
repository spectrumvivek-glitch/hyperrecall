import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const PRESETS = [
  {
    label: "Classic",
    description: "Balanced long-term retention",
    intervals: [
      0, 1, 2, 4, 7, 10, 14, 19, 25, 32, 41,
      52, 65, 81, 100, 122, 148, 178, 212, 250, 293,
      320, 335, 345, 350, 355, 358, 360, 362, 364, 365,
    ],
    color: "#4f46e5",
    badge: "Best for Students",
  },
  {
    label: "Aggressive",
    description: "Fast review, frequent revisits",
    intervals: [
      0, 1, 2, 3, 4, 6, 8, 10, 13, 16, 20,
      25, 31, 38, 47, 58, 71, 86, 104, 125, 149,
      176, 206, 239, 275, 305, 320, 330, 338, 344, 349,
      353, 356, 358, 360, 362, 363, 364, 365, 365, 365,
    ],
    color: "#ef4444",
    badge: "Best for Students",
  },
  {
    label: "Relaxed",
    description: "Slower pace, longer gaps",
    intervals: [
      0, 1, 3, 6, 10, 15, 22, 31, 43, 58, 76,
      98, 124, 155, 190, 230, 275, 310, 330, 345, 352,
      357, 360, 362, 364, 365,
    ],
    color: "#10b981",
  },
];

interface Props {
  intervals: number[];
  onChange: (intervals: number[]) => void;
}

export function IntervalPicker({ intervals, onChange }: Props) {
  const colors = useColors();
  const [inputValue, setInputValue] = useState("");

  const addInterval = () => {
    const val = parseInt(inputValue, 10);
    if (!isNaN(val) && val >= 0 && !intervals.includes(val)) {
      onChange([...intervals, val].sort((a, b) => a - b));
      setInputValue("");
    }
  };

  const removeInterval = (day: number) => {
    onChange(intervals.filter((d) => d !== day));
  };

  const isPresetActive = (preset: typeof PRESETS[0]) =>
    JSON.stringify(preset.intervals) === JSON.stringify(intervals);

  return (
    <View style={styles.container}>
      {/* Presets */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Interval Presets</Text>
        <View style={styles.presets}>
          {PRESETS.map((preset) => {
            const isActive = isPresetActive(preset);
            return (
              <TouchableOpacity
                key={preset.label}
                onPress={() => onChange(preset.intervals)}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor: isActive ? preset.color + "18" : colors.card,
                    borderColor: isActive ? preset.color : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.presetDot, { backgroundColor: preset.color }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.presetTitleRow}>
                    <Text style={[styles.presetLabel, { color: isActive ? preset.color : colors.foreground }]}>
                      {preset.label}
                    </Text>
                    {preset.badge && (
                      <View style={[styles.badge, { backgroundColor: preset.color + "1A", borderColor: preset.color + "55" }]}>
                        <Feather name="award" size={10} color={preset.color} />
                        <Text style={[styles.badgeText, { color: preset.color }]}>{preset.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.presetDesc, { color: colors.mutedForeground }]}>
                    {preset.description}
                  </Text>
                </View>
                {isActive && (
                  <Feather name="check" size={14} color={preset.color} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Current intervals */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Schedule ({intervals.length} steps) · 0 = same day
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            {intervals.map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => removeInterval(day)}
                style={[styles.chip, { backgroundColor: colors.accent, borderColor: colors.border }]}
              >
                <Text style={[styles.chipText, { color: colors.accentForeground }]}>
                  {day === 0 ? "Same day" : `${day}d`}
                </Text>
                <Feather name="x" size={11} color={colors.accentForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Add custom */}
      <View style={styles.addRow}>
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Add day (e.g. 45)"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          onSubmitEditing={addInterval}
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.muted,
              borderRadius: colors.radius / 2,
              borderColor: colors.border,
            },
          ]}
        />
        <TouchableOpacity
          onPress={addInterval}
          style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  section: { gap: 8 },
  label: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  presets: { gap: 8 },
  presetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  presetDot: { width: 10, height: 10, borderRadius: 5 },
  presetTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  presetLabel: { fontSize: 14, fontWeight: "600" },
  presetDesc: { fontSize: 11, marginTop: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.2 },
  chips: { flexDirection: "row", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12 },
  addRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  addBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
