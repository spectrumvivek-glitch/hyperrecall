import React from "react";
import { StyleSheet } from "react-native";
import Pdf from "react-native-pdf";

export interface NativePdfRendererProps {
  uri: string;
  onLoadProgress?: (percent: number) => void;
  onLoadComplete?: (numPages: number) => void;
  onPageChanged?: (page: number, total: number) => void;
  onError?: (err: unknown) => void;
}

/**
 * Native-only wrapper around react-native-pdf. Lives in its own file so that
 * Metro's web bundle can resolve the `.web.tsx` stub instead of pulling the
 * native `requireNativeComponent`-using module into the web build.
 */
export function NativePdfRenderer({
  uri,
  onLoadProgress,
  onLoadComplete,
  onPageChanged,
  onError,
}: NativePdfRendererProps) {
  return (
    <Pdf
      source={{ uri, cache: false }}
      style={styles.pdf}
      trustAllCerts={false}
      enablePaging={false}
      enableDoubleTapZoom
      enableAntialiasing
      fitPolicy={0}
      spacing={8}
      minScale={1.0}
      maxScale={4.0}
      onLoadProgress={onLoadProgress}
      onLoadComplete={(numPages) => onLoadComplete?.(numPages)}
      onPageChanged={(page, total) => onPageChanged?.(page, total)}
      onError={(err) => onError?.(err)}
    />
  );
}

const styles = StyleSheet.create({
  pdf: { flex: 1, backgroundColor: "#0f172a" },
});

export default NativePdfRenderer;
