import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { RankInfo } from "@/lib/ranks";

type Props = {
  rank: RankInfo;
  size?: "sm" | "md" | "lg";
  unlocked?: boolean;
};

function lighten(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${mix(r).toString(16).padStart(2, "0")}${mix(g)
    .toString(16)
    .padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`;
}

function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `#${mix(r).toString(16).padStart(2, "0")}${mix(g)
    .toString(16)
    .padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`;
}

/** Octagonal rank crest path on a 100×100 viewBox. */
const OCTA_PATH =
  "M50 4 L74 12 L92 30 L96 54 L84 78 L60 94 L40 94 L16 78 L4 54 L8 30 L26 12 Z";

/** Premium rank crest with metallic rim, glossy highlights, ribbon ribbon. */
export function PremiumRankIcon({ rank, size = "md", unlocked = true }: Props) {
  const cfg = {
    sm: { wrap: 44, icon: 16, ribbonH: 14, romanFs: 9, ribbonOffset: -4 },
    md: { wrap: 64, icon: 24, ribbonH: 18, romanFs: 11, ribbonOffset: -6 },
    lg: { wrap: 96, icon: 36, ribbonH: 26, romanFs: 14, ribbonOffset: -8 },
  }[size];

  const baseColor = unlocked ? rank.color : "#71717A";
  const light = unlocked ? lighten(baseColor, 0.6) : "#A1A1AA";
  const mid = baseColor;
  const dark = unlocked ? darken(baseColor, 0.45) : "#3F3F46";
  const rimLight = unlocked ? lighten(baseColor, 0.85) : "#D4D4D8";
  const rimDark = unlocked ? darken(baseColor, 0.65) : "#27272A";

  const idSuffix = `${rank.rankIndex}-${rank.step}-${unlocked ? "on" : "off"}`;
  const faceId = `rkface-${idSuffix}`;
  const rimId = `rkrim-${idSuffix}`;
  const innerGlowId = `rkglow-${idSuffix}`;
  const glossId = `rkgloss-${idSuffix}`;

  const totalH = cfg.wrap + Math.abs(cfg.ribbonOffset) + cfg.ribbonH / 2 + 4;

  return (
    <View
      style={{
        width: cfg.wrap,
        height: totalH,
        alignItems: "center",
        shadowColor: unlocked ? rank.color : "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: unlocked ? 0.45 : 0.25,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <View style={{ width: cfg.wrap, height: cfg.wrap }}>
        <Svg width={cfg.wrap} height={cfg.wrap} viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id={faceId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={light} stopOpacity="1" />
              <Stop offset="0.5" stopColor={mid} stopOpacity="1" />
              <Stop offset="1" stopColor={dark} stopOpacity="1" />
            </SvgLinearGradient>
            <SvgLinearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={rimLight} stopOpacity="1" />
              <Stop offset="0.5" stopColor={mid} stopOpacity="1" />
              <Stop offset="1" stopColor={rimDark} stopOpacity="1" />
            </SvgLinearGradient>
            <RadialGradient id={innerGlowId} cx="35%" cy="25%" r="75%" fx="30%" fy="20%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={unlocked ? 0.6 : 0.3} />
              <Stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
            <SvgLinearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={unlocked ? 0.6 : 0.25} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>

          {/* Outer metallic rim */}
          <Path d={OCTA_PATH} fill={`url(#${rimId})`} />
          {/* Inner face — slightly inset */}
          <Path
            d={OCTA_PATH}
            fill={`url(#${faceId})`}
            transform="translate(4,4) scale(0.92)"
            stroke={rimDark}
            strokeWidth="0.6"
          />
          {/* Faceted accents (subtle inner triangles for crystalline look) */}
          <Polygon
            points="50,10 70,20 50,38 30,20"
            fill="#ffffff"
            opacity={unlocked ? 0.12 : 0.05}
          />
          <Polygon
            points="50,90 70,80 50,62 30,80"
            fill="#000000"
            opacity={unlocked ? 0.12 : 0.05}
          />
          {/* 3D radial highlight */}
          <Path
            d={OCTA_PATH}
            fill={`url(#${innerGlowId})`}
            transform="translate(4,4) scale(0.92)"
          />
          {/* Top gloss ellipse */}
          <Ellipse
            cx="50"
            cy="22"
            rx="32"
            ry="11"
            fill={`url(#${glossId})`}
            transform="translate(4,4) scale(0.92)"
          />
          {/* Inner thin border */}
          <Path
            d={OCTA_PATH}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={unlocked ? 0.4 : 0.18}
            strokeWidth="0.8"
            transform="translate(9,9) scale(0.82)"
          />
        </Svg>

        {/* Centered Feather glyph */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: cfg.wrap,
            height: cfg.wrap,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather
            name={rank.icon}
            size={cfg.icon}
            color="#ffffff"
            style={{
              textShadowColor: "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
              opacity: unlocked ? 1 : 0.55,
            }}
          />
        </View>
      </View>

      {/* Roman ribbon — gradient pill rendered via expo-linear-gradient so it
          always fills the rounded container (the previous SVG-based fill was
          intermittently blank on Android due to absolute % sizing). */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          alignSelf: "center",
          height: cfg.ribbonH,
          minWidth: cfg.ribbonH * 1.8,
          borderRadius: cfg.ribbonH / 2,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.55)",
        }}
      >
        <LinearGradient
          colors={[rimLight, mid, rimDark]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            flex: 1,
            paddingHorizontal: cfg.ribbonH * 0.55,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: cfg.romanFs,
              fontWeight: "900",
              letterSpacing: 0.8,
              textShadowColor: "rgba(0,0,0,0.55)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {rank.stepRoman}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
}
