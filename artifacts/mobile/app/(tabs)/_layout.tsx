import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function DueBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -5,
        right: -10,
        backgroundColor: "#EF4444",
        borderRadius: 8,
        minWidth: 17,
        height: 17,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: "#D7DEE8",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const safeAreaInsets = useSafeAreaInsets();
  const { dueNotes } = useApp();

  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#F8FAFC",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          paddingTop: 8,
          ...(isWeb ? { height: 88 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Revise",
          tabBarIcon: ({ color }) => (
            <View style={{ position: "relative" }}>
              {isIOS ? (
                <SymbolView name="checkmark.circle" tintColor={color} size={24} />
              ) : (
                <Feather name="check-circle" size={22} color={color} />
              )}
              <DueBadge count={dueNotes.length} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="note.text" tintColor={color} size={24} />
            ) : (
              <Feather name="file-text" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="exam"
        options={{
          title: "Exam",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="graduationcap" tintColor={color} size={24} />
            ) : (
              <Feather name="award" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={24} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gear" tintColor={color} size={24} />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
