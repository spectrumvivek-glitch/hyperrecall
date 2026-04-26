import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

function ReviewIcon({ color, isIOS }: { color: string; isIOS: boolean }) {
  const { dueNotes } = useApp();
  const count = dueNotes.length;
  return (
    <View>
      {isIOS ? (
        <SymbolView name="checkmark.circle" tintColor={color} size={24} />
      ) : (
        <Feather name="check-circle" size={22} color={color} />
      )}
      {count > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            backgroundColor: "#EF4444",
            borderRadius: 8,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 3,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 9,
              fontWeight: "700",
              lineHeight: 12,
            }}
          >
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const safeAreaInsets = useSafeAreaInsets();

  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        animation: "shift",
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: "700",
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 3,
        },
        tabBarItemStyle: {
          paddingHorizontal: 6,
          paddingTop: 4,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: 12,
          left: 14,
          right: 14,
          backgroundColor: isIOS ? "transparent" : "rgba(248, 250, 252, 0.96)",
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: "#0F172A",
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          paddingBottom: safeAreaInsets.bottom + 10,
          paddingTop: 10,
          height: safeAreaInsets.bottom + 84,
          borderRadius: 24,
          overflow: "hidden",
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={92}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(248, 250, 252, 0.96)" },
              ]}
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
          title: "Review",
          tabBarIcon: ({ color }) => <ReviewIcon color={color} isIOS={isIOS} />,
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
          title: "Exam Mode",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="graduationcap" tintColor={color} size={24} />
            ) : (
              <Feather name="award" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="studymate"
        options={{
          title: "StudyMate",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
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
          href: null,
          title: "Settings",
        }}
      />
    </Tabs>
  );
}
