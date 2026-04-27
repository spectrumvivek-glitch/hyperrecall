import { Feather } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { BadgeDef, RARITY_COLORS } from "@/lib/badges";

type Props = {
  badge: BadgeDef;
  earned: boolean;
  size?: number;
};

/**
 * Lighten a hex colour by mixing it with white.
 *  amount = 0 → original, amount = 1 → white.
 */
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

/** Hex shield path on a 100×100 viewBox. */
const SHIELD_PATH =
  "M50 4 L88 18 L88 56 C88 76 72 92 50 96 C28 92 12 76 12 56 L12 18 Z";

/**
 * A hexagonal shield with multi-layered gradients, glossy highlight, and
 * inner glyph. Looks polished + premium ("4K-feel") on both light and dark
 * backgrounds.
 */
export function PremiumBadgeIcon({ badge, earned, size = 56 }: Props) {
  const baseColor = earned ? badge.color : "#9CA3AF";
  const rarityColor = RARITY_COLORS[badge.rarity];

  const light = lighten(baseColor, 0.55);
  const mid = baseColor;
  const dark = darken(baseColor, 0.35);

  const rimLight = lighten(baseColor, 0.85);
  const rimDark = darken(baseColor, 0.55);

  const gradId = `bg-${badge.id}-${earned ? "on" : "off"}`;
  const innerGradId = `inner-${badge.id}-${earned ? "on" : "off"}`;
  const rimGradId = `rim-${badge.id}-${earned ? "on" : "off"}`;
  const glossId = `gloss-${badge.id}-${earned ? "on" : "off"}`;

  const iconSize = Math.round(size * 0.4);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: "absolute" }}
      >
        <Defs>
          {/* Main face gradient: light top → mid → dark bottom */}
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} stopOpacity="1" />
            <Stop offset="0.5" stopColor={mid} stopOpacity="1" />
            <Stop offset="1" stopColor={dark} stopOpacity="1" />
          </SvgLinearGradient>

          {/* Inner radial: bright spot top-left for 3D pop */}
          <RadialGradient id={innerGradId} cx="35%" cy="25%" r="70%" fx="30%" fy="20%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={earned ? 0.55 : 0.25} />
            <Stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>

          {/* Rim/edge gradient — metallic */}
          <SvgLinearGradient id={rimGradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={rimLight} stopOpacity="1" />
            <Stop offset="1" stopColor={rimDark} stopOpacity="1" />
          </SvgLinearGradient>

          {/* Top gloss ellipse */}
          <SvgLinearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={earned ? 0.55 : 0.25} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>

        {/* Outer rim — slightly larger shield as metallic frame */}
        <Path d={SHIELD_PATH} fill={`url(#${rimGradId})`} />
        {/* Main face */}
        <Path
          d={SHIELD_PATH}
          fill={`url(#${gradId})`}
          stroke={rimDark}
          strokeWidth="0.8"
          transform="translate(3.5,3.5) scale(0.93)"
        />
        {/* Inner glow / 3D radial highlight */}
        <Path
          d={SHIELD_PATH}
          fill={`url(#${innerGradId})`}
          transform="translate(3.5,3.5) scale(0.93)"
        />
        {/* Top gloss reflection */}
        <Ellipse
          cx="50"
          cy="22"
          rx="28"
          ry="10"
          fill={`url(#${glossId})`}
          transform="translate(3.5,3.5) scale(0.93)"
        />
        {/* Subtle inner border for depth */}
        <Path
          d={SHIELD_PATH}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={earned ? 0.35 : 0.18}
          strokeWidth="0.7"
          transform="translate(8,8) scale(0.84)"
        />
      </Svg>

      {/* Centered Feather glyph on top */}
      <Feather
        name={badge.icon as any}
        size={iconSize}
        color="#ffffff"
        style={{
          textShadowColor: "rgba(0,0,0,0.45)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
          opacity: earned ? 1 : 0.55,
        }}
      />

      {/* Tiny rarity dot for legendary/epic earned badges */}
      {earned && (badge.rarity === "legendary" || badge.rarity === "epic") && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: Math.max(8, size * 0.18),
            height: Math.max(8, size * 0.18),
            borderRadius: size,
            backgroundColor: rarityColor,
            borderWidth: 1.5,
            borderColor: "#ffffff",
            shadowColor: rarityColor,
            shadowOpacity: 0.7,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      )}
    </View>
  );
}
