import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UsernamePromptModal } from "@/components/UsernamePromptModal";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProfileProvider } from "@/context/UserProfileContext";
import { ProGateHost } from "@/lib/proGate";
import { SubscriptionProvider } from "@/lib/revenuecat";

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="revision"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="add-note"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="note-detail"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <UserProfileProvider>
                <SubscriptionProvider>
                  <AppProvider>
                    <GestureHandlerRootView>
                      <KeyboardProvider>
                        <RootLayoutNav />
                        <ProGateHost />
                        <UsernamePromptModal />
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </AppProvider>
                </SubscriptionProvider>
              </UserProfileProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
