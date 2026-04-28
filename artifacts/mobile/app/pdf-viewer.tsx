import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Resolves to NativePdfRenderer.tsx on iOS/Android and NativePdfRenderer.web.tsx
// (a no-op stub) on web — keeps react-native-pdf out of the web bundle.
import { NativePdfRenderer } from "@/components/NativePdfRenderer";
import { useColors } from "@/hooks/useColors";
import { fileExists, openPdfExternally } from "@/lib/openPdfExternally";
import { isIdbBlobRef, resolveIdbRefToObjectUrl } from "@/lib/webBlobStore";

export default function PdfViewerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string; name?: string }>();

  const rawUri = typeof params.uri === "string" ? params.uri : "";
  const name = typeof params.name === "string" && params.name.length > 0 ? params.name : "PDF";

  // For web idb-blob: refs we need to mint a runtime object URL first.
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<{ current: number; total: number } | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const fellBackRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rawUri) {
        setResolveError("No PDF to open.");
        return;
      }
      // Web: idb-blob refs need to be hydrated to a blob: URL the iframe can load.
      if (Platform.OS === "web" && isIdbBlobRef(rawUri)) {
        try {
          const obj = await resolveIdbRefToObjectUrl(rawUri);
          if (cancelled) return;
          if (!obj) {
            setResolveError("This PDF is no longer available. Please re-upload it.");
            return;
          }
          setResolvedUri(obj);
          return;
        } catch (e: any) {
          if (cancelled) return;
          setResolveError(e?.message ?? "Couldn't load this PDF.");
          return;
        }
      }
      // Native: confirm a file:// URI still exists before attempting to render.
      if (Platform.OS !== "web" && rawUri.startsWith("file://")) {
        const ok = await fileExists(rawUri);
        if (cancelled) return;
        if (!ok) {
          setResolveError("This PDF is no longer available. Please re-upload it.");
          return;
        }
      }
      setResolvedUri(rawUri);
    })();
    return () => {
      cancelled = true;
    };
  }, [rawUri]);

  // If rendering fails on native, automatically hand off to the system viewer
  // once (so the user still gets to read the file even if our renderer chokes).
  useEffect(() => {
    if (!renderError || fellBackRef.current) return;
    if (Platform.OS === "web") return;
    fellBackRef.current = true;
    openPdfExternally(rawUri, name).finally(() => {
      // Pop the in-app viewer after handing off so the user isn't left staring
      // at our error state — they'll be back in HyperRecall after closing the
      // external reader.
      closeViewer();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderError, rawUri, name]);

  const closeViewer = () => {
    // router.back() throws "GO_BACK was not handled" if the viewer was the
    // first route in the stack (e.g. opened via deep link). Fall back to the
    // home tab in that case so the user is never stranded.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const headerPad = Platform.OS === "web" ? 12 : insets.top + 8;
  const bottomPad = Platform.OS === "web" ? 12 : insets.bottom + 8;

  const handleOpenExternally = () => {
    // Prefer the hydrated URI when present so web idb-blob refs (which the
    // browser can't open directly) get sent as a usable blob: URL.
    openPdfExternally(resolvedUri || rawUri, name);
  };

  const errorMessage = resolveError || renderError;

  return (
    <View style={[styles.container, { backgroundColor: "#0f172a" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPad }]}>
        <TouchableOpacity
          onPress={closeViewer}
          style={styles.headerBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name}
          </Text>
          {pageInfo && (
            <Text style={styles.headerSub}>
              {pageInfo.current} / {pageInfo.total}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleOpenExternally}
          style={styles.headerBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="external-link" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Feather name="alert-triangle" size={36} color="#fca5a5" />
            <Text style={styles.errorTitle}>Can&apos;t show this PDF</Text>
            <Text style={styles.errorMsg}>{errorMessage}</Text>
            {!resolveError && Platform.OS !== "web" && (
              <Text style={styles.errorHint}>Opening in another app…</Text>
            )}
            {resolveError && (
              <TouchableOpacity
                onPress={handleOpenExternally}
                style={[styles.openExtBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Feather name="external-link" size={16} color={colors.primaryForeground} />
                <Text style={[styles.openExtText, { color: colors.primaryForeground }]}>
                  Open in another app
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : Platform.OS === "web" ? (
          resolvedUri ? (
            // On web, browsers render PDFs natively. An iframe gives us their
            // built-in pinch-to-zoom and page scrolling for free.
            // eslint-disable-next-line react-native/no-inline-styles
            <iframe
              src={resolvedUri}
              title={name}
              // @ts-ignore — DOM iframe props on RN-Web
              style={{ width: "100%", height: "100%", border: "none", backgroundColor: "#fff" }}
            />
          ) : (
            <Loading />
          )
        ) : resolvedUri ? (
          <>
            <NativePdfRenderer
              uri={resolvedUri}
              onLoadProgress={(p) => setLoadProgress(p)}
              onLoadComplete={(numPages) => {
                setLoaded(true);
                setPageInfo((prev) => ({
                  current: prev?.current ?? 1,
                  total: numPages,
                }));
              }}
              onPageChanged={(page, total) => {
                setPageInfo({ current: page, total });
              }}
              onError={(err: any) => {
                console.warn("[pdf-viewer] render error:", err);
                const m =
                  typeof err === "string"
                    ? err
                    : err?.message ?? "Couldn't render this PDF.";
                setRenderError(m);
              }}
            />
            {!loaded && <Loading progress={loadProgress} />}
          </>
        ) : (
          <Loading />
        )}
      </View>

      {/* Footer hint */}
      {!errorMessage && (
        <View style={[styles.hintBar, { paddingBottom: bottomPad }]}>
          <Text style={styles.hintText}>Pinch to zoom • Swipe to scroll pages</Text>
        </View>
      )}
    </View>
  );
}

function Loading({ progress }: { progress?: number }) {
  return (
    <View style={styles.loading} pointerEvents="none">
      <ActivityIndicator color="#fff" size="large" />
      {typeof progress === "number" && progress > 0 && progress < 1 && (
        <Text style={styles.loadingText}>{Math.round(progress * 100)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  headerBtn: { padding: 6 },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "600", maxWidth: "100%" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  body: { flex: 1, backgroundColor: "#0f172a" },
  pdf: { flex: 1, backgroundColor: "#0f172a" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: { color: "#fff", fontSize: 13 },
  hintBar: {
    paddingTop: 8,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  hintText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  errorTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 6 },
  errorMsg: { color: "rgba(255,255,255,0.75)", fontSize: 13, textAlign: "center", lineHeight: 19 },
  errorHint: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 },
  openExtBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  openExtText: { fontSize: 14, fontWeight: "600" },
});
