import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

export default function AddNoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { categories } = useApp();
  const [content, setContent] = useState("");

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 40 }}>
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes / Content</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Add Page number, formulas, explanations..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
          style={styles.contentInput}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
    paddingHorizontal: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  contentInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
  },
});