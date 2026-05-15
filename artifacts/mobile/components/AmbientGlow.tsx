import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Variant =
  | "home"
  | "revise"
  | "notes"
  | "exam"
  | "analytics"
  | "settings"
  | "studymate";

interface Palette {
  a: string; // primary orb
  b: string; // secondary orb
  c: string; // tertiary orb
  d: string; // bottom accent
  aurora: [string, string, string]; // top aurora gradient
}

const PALETTES: Record<Variant, Palette> = {
  home:      { a: "#A78BFA", b: "#FB923C", c: "#60A5FA", d: "#F472B6", aurora: ["#A78BFA", "#F472B6", "#FB923C"] },
  revise:    { a: "#818CF8", b: "#34D399", c: "#F472B6", d: "#FBBF24", aurora: ["#818CF8", "#34D399", "#06B6D4"] },
  notes:     { a: "#FBBF24", b: "#A78BFA", c: "#34D399", d: "#FB7185", aurora: ["#FBBF24", "#FB923C", "#F472B6"] },
  exam:      { a: "#F472B6", b: "#6366F1", c: "#FB923C", d: "#34D399", aurora: ["#F472B6", "#A78BFA", "#6366F1"] },
  analytics: { a: "#60A5FA", b: "#A78BFA", c: "#FBBF24", d: "#34D399", aurora: ["#60A5FA", "#818CF8", "#A78BFA"] },
  settings:  { a: "#94A3B8", b: "#A78BFA", c: "#60A5FA", d: "#FBBF24", aurora: ["#94A3B8", "#A78BFA", "#60A5FA"] },
  studymate: { a: "#8B5CF6", b: "#EC4899", c: "#06B6D4", d: "#FBBF24", aurora: ["#8B5CF6", "#EC4899", "#06B6D4"] },
};

const SCREEN_W = Dimensions.get("window").width;
const SCREEN_H = Dimensions.get("window").height;
const ORB_SIZE = Math.max(SCREEN_W, 380) * 0.95;

/* ─────────────── Floating animated orb ─────────────── */
interface OrbProps {
  color: string;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  opacity: number;
  size?: number;
}

function Orb({ color, startX, startY, driftX, driftY, duration, opacity, size = ORB_SIZE }: OrbProps) {
  const t = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: duration * 0.7, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: duration * 0.7, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [t, breathe, duration]);

  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, driftX] });
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [0, driftY] });
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: startY,
        left: startX,
        width: size,
        height: size,
        opacity,
        transform: [{ translateX: tx }, { translateY: ty }, { scale }],
      }}
    >
      <LinearGradient
        colors={[color + "FF", color + "55", color + "00"]}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    </Animated.View>
  );
}

/* ─────────────── Twinkling sparkle dot ─────────────── */
interface SparkleProps {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

function Sparkle({ x, y, size, color, delay, duration }: SparkleProps) {
  const o = useRef(new Animated.Value(0)).current;
  const s = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(o, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(s, { toValue: 1.3, duration: duration / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(o, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(s, { toValue: 0.6, duration: duration / 2, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o, s, delay, duration]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: y,
        left: x,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: o,
        transform: [{ scale: s }],
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: size * 1.5,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
      }}
    />
  );
}

/* ─────────────── Aurora top stripe ─────────────── */
function Aurora({ colors }: { colors: [string, string, string] }) {
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [shift]);

  const tx = shift.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -40,
        left: -40,
        right: -40,
        height: 240,
        opacity: 0.55,
        transform: [{ translateX: tx }],
      }}
    >
      <LinearGradient
        colors={[colors[0] + "80", colors[1] + "70", colors[2] + "80"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/* ─────────────── Main exported component ─────────────── */
export function AmbientGlow({ variant = "home" }: { variant?: Variant }) {
  const p = PALETTES[variant];

  const sparkles = useMemo(() => {
    // Deterministic-ish pseudorandom layout (per variant) so positions stay stable.
    const seed = variant.length * 13;
    const rand = (i: number) => {
      const x = Math.sin(seed + i * 9.17) * 10000;
      return x - Math.floor(x);
    };
    return Array.from({ length: 14 }).map((_, i) => ({
      x: rand(i) * SCREEN_W,
      y: rand(i + 50) * (SCREEN_H * 0.85),
      size: 3 + rand(i + 100) * 4,
      color: [p.a, p.b, p.c, p.d, "#FFFFFF"][i % 5],
      delay: rand(i + 200) * 3000,
      duration: 1800 + rand(i + 300) * 2200,
    }));
  }, [variant, p]);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {/* Animated aurora stripe at top */}
      <Aurora colors={p.aurora} />

      {/* 4 floating gradient orbs */}
      <Orb
        color={p.a}
        startX={-ORB_SIZE * 0.35}
        startY={-ORB_SIZE * 0.45}
        driftX={40}
        driftY={30}
        duration={7000}
        opacity={0.55}
      />
      <Orb
        color={p.b}
        startX={SCREEN_W - ORB_SIZE * 0.6}
        startY={-ORB_SIZE * 0.4}
        driftX={-50}
        driftY={45}
        duration={8500}
        opacity={0.45}
      />
      <Orb
        color={p.c}
        startX={-ORB_SIZE * 0.3}
        startY={SCREEN_H * 0.45}
        driftX={35}
        driftY={-30}
        duration={9500}
        opacity={0.32}
        size={ORB_SIZE * 0.85}
      />
      <Orb
        color={p.d}
        startX={SCREEN_W * 0.3}
        startY={SCREEN_H * 0.55}
        driftX={-30}
        driftY={40}
        duration={11000}
        opacity={0.28}
        size={ORB_SIZE * 0.75}
      />

      {/* Twinkling sparkle particles */}
      {sparkles.map((s, i) => (
        <Sparkle key={i} {...s} />
      ))}

      {/* Soft white wash to keep content readable */}
      <LinearGradient
        colors={["#FFFFFF55", "#FFFFFF99", "#FFFFFFEE"]}
        locations={[0, 0.55, 1]}
        style={styles.wash}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
});

/* Silence "unused Platform" if it ever gets pruned */
void Platform;
