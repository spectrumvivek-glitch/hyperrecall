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
    intervals: [0, 1, 2, 3, 5, 7, 10, 14, 18, 25, 35, 45, 60, 75, 90, 110, 130, 150, 180, 210, 240, 270, 300, 330, 365],
    color: "#4f46e5",
  },
  {
    label: "Aggressive",
    description: "Fast review, frequent revisits",
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 14, 18, 22, 30, 40, 55, 70, 90, 120, 150, 180, 210, 240, 300, 365],
    color: "#ef4444",
  },
  {
    label: "Relaxed",
    description: "Slower pace, longer gaps",
    intervals: [0, 2, 3, 5, 8, 12, 16, 22, 30, 40, 55, 70, 85, 100, 120, 140, 160, 180, 210, 240, 270, 300, 330, 350, 365],
    color: "#10b981",
  },
];

type Mode = "custom" | "sm2";

interface Props {
  intervals: number[];
  onChange: (intervals: number[]) => void;
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
}

export function IntervalPicker({ intervals, onChange, mode = "custom", onModeChange }: Props) {
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
      {/* Mode Toggle */}
      {onModeChange && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Revision Mode</Text>
          <View style={[styles.modeToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => onModeChange("custom")}
              style={[
                styles.modeBtn,
                mode === "custom" && { backgroundColor: colors.card, borderColor: colors.primary + "60" },
              ]}
              activeOpacity={0.7}
            >
              <Feather name="sliders" size={14} color={mode === "custom" ? colors.primary : colors.mutedForeground} />
              <View>
                <Text style={[styles.modeBtnTitle, { color: mode === "custom" ? colors.primary : colors.mutedForeground }]}>
                  Simple Intervals
                </Text>
                <Text style={[styles.modeBtnSub, { color: colors.mutedForeground }]}>
                  Fixed day schedule
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onModeChange("sm2")}
              style={[
                styles.modeBtn,
                mode === "sm2" && { backgroundColor: colors.card, borderColor: colors.primary + "60" },
              ]}
              activeOpacity={0.7}
            >
              <Feather name="zap" size={14} color={mode === "sm2" ? colors.warning : colors.mutedForeground} />
              <View>
                <Text style={[styles.modeBtnTitle, { color: mode === "sm2" ? colors.warning : colors.mutedForeground }]}>
                  Smart Learning
                </Text>
                <Text style={[styles.modeBtnSub, { color: colors.mutedForeground }]}>
                  Adapts to your recall
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          {mode === "sm2" && (
            <View style={[styles.sm2Hint, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}>
              <Feather name="info" size={13} color={colors.warning} />
              <Text style={[styles.sm2HintText, { color: colors.warning }]}>
                After each revision, you'll rate how well you recalled the note (Easy / Good / Hard). The app automatically sets your next review date based on your performance.
              </Text>
            </View>
          )}
        </View>
      )}

      {mode === "custom" && (
        <>
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
                      <Text style={[styles.presetLabel, { color: isActive ? preset.color : colors.foreground }]}>
                        {preset.label}
                      </Text>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  section: { gap: 8 },
  label: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modeBtnTitle: { fontSize: 13 },
  modeBtnSub: { fontSize: 11, marginTop: 1 },
  sm2Hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sm2HintText: { flex: 1, fontSize: 12, lineHeight: 18 },
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
  presetLabel: { fontSize: 14 },
  presetDesc: { fontSize: 11, marginTop: 1 },
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
