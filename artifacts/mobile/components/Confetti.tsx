import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: SW } = Dimensions.get("window");

const COLORS = [
  "#6366F1", "#8B5CF6", "#F59E0B", "#22C55E",
  "#EF4444", "#EC4899", "#06B6D4", "#F97316",
];

const COUNT = 24;

type Particle = {
  tx: Animated.Value;
  ty: Animated.Value;
  op: Animated.Value;
  rot: Animated.Value;
  color: string;
  size: number;
  isSquare: boolean;
  startX: number;
  driftX: number;
  driftY: number;
  spin: number;
  delay: number;
};

function makeParticles(originX: number): Particle[] {
  return Array.from({ length: COUNT }, (_, i) => ({
    tx: new Animated.Value(0),
    ty: new Animated.Value(0),
    op: new Animated.Value(0),
    rot: new Animated.Value(0),
    color: COLORS[i % COLORS.length],
    size: 5 + (i % 5) * 2,
    isSquare: i % 3 === 0,
    startX: originX + (Math.sin(i * 1.3) * SW * 0.4),
    driftX: (i % 2 === 0 ? 1 : -1) * (30 + (i * 13) % 110),
    driftY: -(80 + (i * 17) % 260),
    spin: i % 2 === 0 ? 360 : -360,
    delay: i * 28,
  }));
}

interface Props {
  visible: boolean;
  originX?: number;
  originY?: number;
  onDone?: () => void;
}

export function Confetti({ visible, originX = SW / 2, originY = 200, onDone }: Props) {
  const particles = useRef<Particle[]>(makeParticles(originX));
  const running = useRef(false);

  useEffect(() => {
    if (!visible || running.current) return;
    running.current = true;

    const ps = particles.current;
    ps.forEach((p) => {
      p.tx.setValue(0);
      p.ty.setValue(0);
      p.op.setValue(0);
      p.rot.setValue(0);
    });

    const anims = ps.map((p) =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.op, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(p.tx, { toValue: p.driftX, duration: 700, useNativeDriver: true }),
          Animated.timing(p.ty, { toValue: p.driftY, duration: 700, useNativeDriver: true }),
          Animated.timing(p.rot, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.timing(p.op, { toValue: 0, duration: 350, useNativeDriver: true }),
      ])
    );

    Animated.parallel(anims).start(() => {
      running.current = false;
      onDone?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.current.map((p, i) => {
        const rotate = p.rot.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${p.spin}deg`],
        });
        const size = p.size;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: p.startX - size / 2,
              top: originY,
              width: size,
              height: p.isSquare ? size : size * 0.5 + 2,
              borderRadius: p.isSquare ? 2 : size / 2,
              backgroundColor: p.color,
              opacity: p.op,
              transform: [{ translateX: p.tx }, { translateY: p.ty }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
