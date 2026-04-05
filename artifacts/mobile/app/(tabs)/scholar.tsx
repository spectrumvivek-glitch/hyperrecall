import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { useColors } from "@/hooks/useColors";

const API_BASE = process.env["EXPO_PUBLIC_DOMAIN"]
  ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`
  : "http://localhost:8080";

type ScholarResponse = {
  explanation: string;
  steps: string[];
  summary: string;
  followUp: string[];
};

type Message = {
  id: string;
  role: "user" | "scholar";
  question?: string;
  imageUri?: string;
  response?: ScholarResponse;
  error?: string;
};

function mkId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const { FileSystem } = await import("expo-file-system");
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

function StepCard({
  steps,
  colors,
}: {
  steps: string[];
  colors: ReturnType<typeof useColors>;
}) {
  if (!steps.length) return null;
  return (
    <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionLabel, { color: colors.primary }]}>Key Points</Text>
      {steps.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={[styles.stepBullet, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNum}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

function FollowUpChips({
  questions,
  onTap,
  colors,
}: {
  questions: string[];
  onTap: (q: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (!questions.length) return null;
  return (
    <View style={styles.followUpWrap}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Ask next</Text>
      {questions.map((q, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onTap(q)}
          style={[styles.followUpChip, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "12" }]}
          activeOpacity={0.7}
        >
          <Feather name="corner-down-right" size={13} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.followUpText, { color: colors.primary }]}>{q}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ScholarBubble({
  msg,
  onFollowUp,
  colors,
}: {
  msg: Message;
  onFollowUp: (q: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (msg.role === "user") {
    return (
      <View style={styles.userBubbleWrap}>
        {msg.imageUri && (
          <Image source={{ uri: msg.imageUri }} style={styles.attachedImage} />
        )}
        <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
          <Text style={styles.userBubbleText}>{msg.question}</Text>
        </View>
      </View>
    );
  }

  if (msg.error) {
    return (
      <View style={[styles.errorBubble, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
        <Feather name="alert-circle" size={16} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.destructive }]}>{msg.error}</Text>
      </View>
    );
  }

  const r = msg.response!;
  return (
    <View style={[styles.scholarBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.scholarHeader}>
        <View style={[styles.scholarAvatar, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="cpu" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.scholarLabel, { color: colors.primary }]}>Scholar</Text>
      </View>

      <Text style={[styles.explanationText, { color: colors.foreground }]}>{r.explanation}</Text>

      <StepCard steps={r.steps} colors={colors} />

      {r.summary ? (
        <View style={[styles.summaryCard, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
          <Feather name="bookmark" size={13} color={colors.success} style={{ marginRight: 6, marginTop: 2 }} />
          <Text style={[styles.summaryText, { color: colors.foreground }]}>{r.summary}</Text>
        </View>
      ) : null}

      <FollowUpChips questions={r.followUp} onTap={onFollowUp} colors={colors} />
    </View>
  );
}

export default function ScholarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 88 : insets.bottom + 8;

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function sendQuestion(questionText?: string) {
    const q = (questionText ?? input).trim();
    if (!q && !imageUri) return;
    if (loading) return;

    const userMsg: Message = {
      id: mkId(),
      role: "user",
      question: q || "(image question)",
      imageUri: imageUri ?? undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const capturedUri = imageUri;
    setImageUri(null);
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      let imageBase64: string | undefined;
      if (capturedUri) {
        imageBase64 = await uriToBase64(capturedUri);
      }

      const res = await fetch(`${API_BASE}/api/tutor/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, imageBase64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as ScholarResponse;

      const scholarMsg: Message = {
        id: mkId(),
        role: "scholar",
        response: data,
      };
      setMessages((prev) => [...prev, scholarMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: mkId(),
        role: "scholar",
        error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="cpu" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Scholar AI</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Your personal study tutor</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[styles.messageContent, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="book-open" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ask Scholar anything</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Get clear explanations, step-by-step breakdowns, and follow-up questions to deepen your understanding.
            </Text>
            <View style={styles.suggestions}>
              {[
                "Explain photosynthesis simply",
                "What is Newton's third law?",
                "How does memory consolidation work?",
              ].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => sendQuestion(s)}
                  style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg) => (
          <ScholarBubble
            key={msg.id}
            msg={msg}
            onFollowUp={(q) => sendQuestion(q)}
            colors={colors}
          />
        ))}

        {loading && (
          <View style={[styles.loadingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Scholar is thinking…</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputArea, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad }]}>
        {imageUri && (
          <View style={styles.imagePreviewRow}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity onPress={() => setImageUri(null)} style={[styles.removeImage, { backgroundColor: colors.destructive }]}>
              <Feather name="x" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={pickImage} style={styles.attachBtn} activeOpacity={0.7}>
            <Feather name="image" size={20} color={imageUri ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Ask a question…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => sendQuestion()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={() => sendQuestion()}
            disabled={loading || (!input.trim() && !imageUri)}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  loading || (!input.trim() && !imageUri)
                    ? colors.muted
                    : colors.primary,
              },
            ]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  messages: { flex: 1 },
  messageContent: { padding: 16, gap: 14 },
  emptyState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  suggestions: { width: "100%", gap: 10 },
  suggestionChip: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 14, fontWeight: "500" },
  userBubbleWrap: { alignItems: "flex-end", gap: 8 },
  userBubble: { maxWidth: "80%", padding: 14, borderRadius: 16, borderBottomRightRadius: 4 },
  userBubbleText: { color: "#fff", fontSize: 15, lineHeight: 22 },
  attachedImage: { width: 160, height: 120, borderRadius: 10 },
  scholarBubble: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  scholarHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  scholarAvatar: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  scholarLabel: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  explanationText: { fontSize: 15, lineHeight: 24 },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  stepsCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepBullet: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  stepNum: { color: "#fff", fontSize: 11, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 21 },
  summaryCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: 10, borderWidth: 1, padding: 12 },
  summaryText: { flex: 1, fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  followUpWrap: { gap: 8 },
  followUpChip: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1 },
  followUpText: { flex: 1, fontSize: 13, fontWeight: "500" },
  errorBubble: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 14 },
  loadingBubble: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  loadingText: { fontSize: 14 },
  inputArea: { borderTopWidth: 1, padding: 12, gap: 8 },
  imagePreviewRow: { position: "relative", alignSelf: "flex-start" },
  imagePreview: { width: 80, height: 60, borderRadius: 8 },
  removeImage: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", borderRadius: 16, borderWidth: 1, paddingLeft: 4, paddingRight: 4, paddingVertical: 4, gap: 4 },
  attachBtn: { padding: 10 },
  textInput: { flex: 1, fontSize: 15, maxHeight: 120, paddingVertical: 8, paddingHorizontal: 4 },
  sendBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
