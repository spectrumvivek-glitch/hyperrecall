import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle, googleAvailable, isLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";

  function getFirebaseError(code: string): string {
    switch (code) {
      case "auth/invalid-email": return "That email address is not valid.";
      case "auth/user-not-found": return "No account found with that email.";
      case "auth/wrong-password": return "Incorrect password. Please try again.";
      case "auth/email-already-in-use": return "An account with that email already exists.";
      case "auth/weak-password": return "Password must be at least 6 characters.";
      case "auth/too-many-requests": return "Too many attempts. Please wait a moment.";
      case "auth/network-request-failed": return "Network error. Check your connection.";
      default: return "Something went wrong. Please try again.";
    }
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    if (isSignup && trimmedPassword !== confirmPassword.trim()) {
      Alert.alert("Passwords don't match", "Please make sure both passwords are the same.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp(trimmedEmail, trimmedPassword);
      } else {
        await signIn(trimmedEmail, trimmedPassword);
      }
    } catch (err: any) {
      const code = err?.code ?? "";
      Alert.alert(isSignup ? "Sign Up Failed" : "Sign In Failed", getFirebaseError(code));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (!googleAvailable) {
      Alert.alert(
        "Google Sign-In Not Configured",
        "To enable Google Sign-In, set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment with your Firebase project's Web OAuth 2.0 client ID."
      );
      return;
    }
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert("Google Sign-In Failed", err.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F5F7FB" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGrad}
          >
            <Feather name="zap" size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.appName}>Recallify</Text>
          <Text style={styles.tagline}>Your smart revision companion</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "login" && styles.toggleActive]}
              onPress={() => setMode("login")}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}>
                Log In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "signup" && styles.toggleActive]}
              onPress={() => setMode("signup")}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, mode === "signup" && styles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle}>
            {isSignup ? "Create your account" : "Welcome back"}
          </Text>
          <Text style={styles.cardSub}>
            {isSignup
              ? "Start your learning journey today"
              : "Sign in to continue your progress"}
          </Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Feather name="mail" size={16} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!submitting}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Feather name="lock" size={16} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!submitting}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password (signup only) */}
          {isSignup && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputRow}>
                <Feather name="lock" size={16} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!submitting}
                />
              </View>
            </View>
          )}

          {/* Primary CTA */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || isLoading}
            activeOpacity={0.85}
            style={styles.primaryBtn}
          >
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isSignup ? "Create Account" : "Sign In"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            onPress={handleGoogle}
            disabled={submitting}
            activeOpacity={0.85}
            style={[
              styles.googleBtn,
              !googleAvailable && { opacity: 0.55 },
            ]}
          >
            <View style={styles.googleBtnInner}>
              <GoogleIcon size={20} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </View>
            {!googleAvailable && (
              <Text style={styles.googleNote}>Requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E8EDF4",
      }}
    >
      <Text style={{ fontSize: size * 0.6, fontWeight: "800", color: "#4285F4" }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 24,
    alignItems: "center",
  },
  brand: {
    alignItems: "center",
    gap: 10,
  },
  logoGrad: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: "#D7DEE8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  toggleTextActive: {
    color: "#6366F1",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: -8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D7DEE8",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 4,
  },
  primaryBtnGrad: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8EDF4",
  },
  dividerText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  googleBtn: {
    borderWidth: 1.5,
    borderColor: "#D7DEE8",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
  },
  googleBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  googleNote: {
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "center",
  },
  footer: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
