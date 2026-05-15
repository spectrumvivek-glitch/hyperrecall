import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Variant = "home" | "revise" | "notes" | "exam" | "analytics" | "settings" | "studymate";

const PALETTES: Record<Variant, { tl: string; tr: string; bl: string }> = {
  home:      { tl: "#A78BFA", tr: "#FBA74D", bl: "#60A5FA" },
  revise:    { tl: "#818CF8", tr: "#34D399", bl: "#F472B6" },
  notes:     { tl: "#FBBF24", tr: "#A78BFA", bl: "#34D399" },
  exam:      { tl: "#F472B6", tr: "#6366F1", bl: "#FB923C" },
  analytics: { tl: "#60A5FA", tr: "#A78BFA", bl: "#FBBF24" },
  settings:  { tl: "#94A3B8", tr: "#A78BFA", bl: "#60A5FA" },
  studymate: { tl: "#8B5CF6", tr: "#EC4899", bl: "#06B6D4" },
};

/**
 * Decorative ambient light blobs that sit behind a tab's content.
 * Pure visual sugar — pointer-events disabled so it never blocks taps.
 */
export function AmbientGlow({ variant = "home" }: { variant?: Variant }) {
  const p = PALETTES[variant];

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {/* Top-left soft halo */}
      <LinearGradient
        colors={[p.tl + "55", p.tl + "00"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.blob, styles.blobTL]}
      />
      {/* Top-right soft halo */}
      <LinearGradient
        colors={[p.tr + "4D", p.tr + "00"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.blob, styles.blobTR]}
      />
      {/* Bottom-left subtle halo */}
      <LinearGradient
        colors={[p.bl + "33", p.bl + "00"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.blob, styles.blobBL]}
      />
      {/* Subtle vignette overlay to blend everything into the bg */}
      <LinearGradient
        colors={["#FFFFFF00", "#FFFFFFCC"]}
        style={styles.vignette}
      />
    </View>
  );
}

const SIZE = Platform.OS === "web" ? 520 : 460;

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  blobTL: {
    top: -SIZE * 0.55,
    left: -SIZE * 0.4,
  },
  blobTR: {
    top: -SIZE * 0.45,
    right: -SIZE * 0.45,
  },
  blobBL: {
    bottom: -SIZE * 0.45,
    left: -SIZE * 0.35,
    width: SIZE * 0.9,
    height: SIZE * 0.9,
    borderRadius: SIZE * 0.45,
  },
  vignette: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
});
