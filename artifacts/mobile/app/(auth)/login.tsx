import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
  const {
    signIn,
    signUp,
    signInWithGoogle,
    googleAvailable,
    isAuthenticating,
    authError,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const visibleError = localError || authError;

  function switchMode(next: Mode) {
    setMode(next);
    setDisplayName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setLocalError(null);
    clearAuthError();
  }

  function dismissError() {
    setLocalError(null);
    clearAuthError();
  }

  async function handleSubmit() {
    dismissError();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = displayName.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setLocalError("Please enter your email and password.");
      return;
    }
    if (isSignup && trimmedPassword.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (isSignup && trimmedPassword !== confirmPassword.trim()) {
      setLocalError("Passwords don't match. Please make sure both passwords are the same.");
      return;
    }

    try {
      if (isSignup) {
        await signUp(trimmedEmail, trimmedPassword, trimmedName || undefined);
      } else {
        await signIn(trimmedEmail, trimmedPassword);
      }
    } catch {
      // authError is set in AuthContext and will show via visibleError
    }
  }

  async function handleGoogle() {
    dismissError();
    try {
      await signInWithGoogle();
    } catch {
      // authError surfaces via visibleError
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
          <Text style={styles.appName}>HyperRecall</Text>
          <Text style={styles.tagline}>Your smart revision companion</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "login" && styles.toggleActive]}
              onPress={() => switchMode("login")}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}>
                Log In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "signup" && styles.toggleActive]}
              onPress={() => switchMode("signup")}
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

          {/* Inline Error Banner */}
          {visibleError ? (
            <TouchableOpacity onPress={dismissError} activeOpacity={0.8} style={styles.errorBanner}>
              <Feather name="alert-circle" size={15} color="#DC2626" />
              <Text style={styles.errorText}>{visibleError}</Text>
              <Feather name="x" size={14} color="#DC2626" />
            </TouchableOpacity>
          ) : null}

          {/* Display Name (signup only) */}
          {isSignup && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputRow}>
                <Feather name="user" size={16} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                  value={displayName}
                  onChangeText={setDisplayName}
                  editable={!isAuthenticating}
                />
              </View>
            </View>
          )}

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
                editable={!isAuthenticating}
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
                editable={!isAuthenticating}
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
                  editable={!isAuthenticating}
                />
              </View>
            </View>
          )}

          {/* Primary CTA */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isAuthenticating}
            activeOpacity={0.85}
            style={[styles.primaryBtn, isAuthenticating && { opacity: 0.75 }]}
          >
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              {isAuthenticating ? (
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
            disabled={isAuthenticating}
            activeOpacity={0.85}
            style={[
              styles.googleBtn,
              (!googleAvailable || isAuthenticating) && { opacity: 0.55 },
            ]}
          >
            <View style={styles.googleBtnInner}>
              {isAuthenticating ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <GoogleIcon size={20} />
              )}
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </View>
            {!googleAvailable && (
              <Text style={styles.googleNote}>
                Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Google Sign-In
              </Text>
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
  brand: { alignItems: "center", gap: 10 },
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
  tagline: { fontSize: 14, color: "#64748B", fontWeight: "500" },
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
  toggleText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  toggleTextActive: { color: "#6366F1" },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  cardSub: { fontSize: 13, color: "#64748B", marginTop: -8 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#DC2626",
    lineHeight: 18,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
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
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: "#0F172A" },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },
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
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E8EDF4" },
  dividerText: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
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
  googleBtnText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  googleNote: { fontSize: 10, color: "#94A3B8", textAlign: "center" },
  footer: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
