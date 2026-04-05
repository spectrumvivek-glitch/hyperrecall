import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const PRESETS = [
  { label: "Classic", intervals: [1, 3, 7, 15, 30] },
  { label: "Aggressive", intervals: [1, 2, 4, 7, 14, 21] },
  { label: "Relaxed", intervals: [1, 7, 21, 60] },
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
    if (!isNaN(val) && val > 0 && !intervals.includes(val)) {
      onChange([...intervals, val].sort((a, b) => a - b));
      setInputValue("");
    }
  };

  const removeInterval = (day: number) => {
    onChange(intervals.filter((d) => d !== day));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Revision intervals (days)
      </Text>

      {/* Presets */}
      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const isActive = JSON.stringify(preset.intervals) === JSON.stringify(intervals);
          return (
            <TouchableOpacity
              key={preset.label}
              onPress={() => onChange(preset.intervals)}
              style={[
                styles.presetBtn,
                {
                  borderRadius: colors.radius / 2,
                  backgroundColor: isActive ? colors.primary : colors.muted,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderWidth: 1,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: isActive ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Current intervals */}
      <View style={styles.chips}>
        {intervals.map((day) => (
          <View
            key={day}
            style={[
              styles.chip,
              {
                backgroundColor: colors.accent,
                borderRadius: colors.radius / 2,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.accentForeground }]}>
              {day}d
            </Text>
            <TouchableOpacity onPress={() => removeInterval(day)}>
              <Feather name="x" size={12} color={colors.accentForeground} />
            </TouchableOpacity>
          </View>
        ))}
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
              fontFamily: "Inter_400Regular",
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
  container: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  presets: {
    flexDirection: "row",
    gap: 8,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  addRow: {
    flexDirection: "row",
    gap: 8,
  },
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
