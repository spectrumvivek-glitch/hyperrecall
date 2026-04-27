import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import type { useColors } from "@/hooks/useColors";

export type DayPoint = {
  date: number;
  label: string;
  completed: number;
  skipped: number;
};

type Props = {
  data: DayPoint[];
  colors: ReturnType<typeof useColors>;
  height?: number;
};

const VIEW_W = 320;
const PAD_L = 28;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 22;

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  const tension = 0.18;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export function AnalyticsLineChart({ data, colors, height = 180 }: Props) {
  const VIEW_H = height;
  const innerW = VIEW_W - PAD_L - PAD_R;
  const innerH = VIEW_H - PAD_T - PAD_B;

  const { completedPts, skippedPts, areaPath, donePath, skipPath, maxVal, gridLines } =
    useMemo(() => {
      const max = Math.max(...data.map((d) => Math.max(d.completed, d.skipped)), 4);
      // round up to a "nice" upper bound
      const niceMax = Math.ceil(max / 4) * 4 || 4;
      const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
      const yFor = (v: number) =>
        PAD_T + innerH - (v / niceMax) * innerH;
      const completed = data.map((d, i) => ({
        x: PAD_L + i * stepX,
        y: yFor(d.completed),
      }));
      const skipped = data.map((d, i) => ({
        x: PAD_L + i * stepX,
        y: yFor(d.skipped),
      }));

      const dDone = smoothPath(completed);
      const dSkip = smoothPath(skipped);

      // Closed area path under the completed line for gradient fill
      const baseY = PAD_T + innerH;
      const area =
        completed.length > 0
          ? `${dDone} L${completed[completed.length - 1].x},${baseY} L${completed[0].x},${baseY} Z`
          : "";

      const gridCount = 4;
      const grid = Array.from({ length: gridCount + 1 }, (_, i) => {
        const v = (niceMax * (gridCount - i)) / gridCount;
        return { y: yFor(v), value: Math.round(v) };
      });

      return {
        completedPts: completed,
        skippedPts: skipped,
        areaPath: area,
        donePath: dDone,
        skipPath: dSkip,
        maxVal: niceMax,
        gridLines: grid,
      };
    }, [data, innerH, innerW]);

  // Find today's index (last in array). Highlight last point.
  const todayIdx = data.length - 1;
  const todayPt = completedPts[todayIdx];
  const todaySkipPt = skippedPts[todayIdx];

  // X-axis labels: show first, every 5 days, and "Today" at end
  const xLabels = data.map((d, i) => {
    const isLast = i === data.length - 1;
    const isFirst = i === 0;
    if (isLast) return { x: PAD_L + (innerW / Math.max(1, data.length - 1)) * i, label: "Today" };
    if (isFirst) return { x: PAD_L + (innerW / Math.max(1, data.length - 1)) * i, label: `${data.length - 1}d` };
    if ((data.length - 1 - i) % 5 === 0) {
      return { x: PAD_L + (innerW / Math.max(1, data.length - 1)) * i, label: `${data.length - 1 - i}d` };
    }
    return null;
  }).filter((v): v is { x: number; label: string } => v != null);

  const totalDone = data.reduce((s, d) => s + d.completed, 0);
  const totalSkip = data.reduce((s, d) => s + d.skipped, 0);

  return (
    <View style={{ width: "100%" }}>
      <Svg
        width="100%"
        height={VIEW_H}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>

        {/* Y-axis gridlines + labels */}
        {gridLines.map((g, i) => (
          <React.Fragment key={`grid-${i}`}>
            <Line
              x1={PAD_L}
              x2={VIEW_W - PAD_R}
              y1={g.y}
              y2={g.y}
              stroke={colors.border}
              strokeWidth={0.6}
              strokeDasharray="3,4"
              opacity={0.7}
            />
            <SvgText
              x={PAD_L - 6}
              y={g.y + 3}
              fill={colors.mutedForeground}
              fontSize="8"
              textAnchor="end"
            >
              {g.value}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Area fill under completed line */}
        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

        {/* Skipped line (background, dashed) */}
        {skipPath ? (
          <Path
            d={skipPath}
            fill="none"
            stroke={colors.warning}
            strokeWidth={1.6}
            strokeDasharray="4,3"
            strokeLinecap="round"
          />
        ) : null}

        {/* Completed line (foreground) */}
        {donePath ? (
          <Path
            d={donePath}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Today's point — emphasized */}
        {todayPt && (
          <>
            <Circle
              cx={todayPt.x}
              cy={todayPt.y}
              r={5.5}
              fill={colors.primary}
              opacity={0.18}
            />
            <Circle
              cx={todayPt.x}
              cy={todayPt.y}
              r={3.2}
              fill={colors.primary}
              stroke={colors.background}
              strokeWidth={1.2}
            />
          </>
        )}
        {todaySkipPt && (
          <Circle
            cx={todaySkipPt.x}
            cy={todaySkipPt.y}
            r={2.4}
            fill={colors.warning}
            stroke={colors.background}
            strokeWidth={1}
          />
        )}

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <SvgText
            key={`xl-${i}`}
            x={l.x}
            y={VIEW_H - 6}
            fill={colors.mutedForeground}
            fontSize="8.5"
            fontWeight="600"
            textAnchor="middle"
          >
            {l.label}
          </SvgText>
        ))}
      </Svg>

      {/* Footer summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{totalDone}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            completed
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{totalSkip}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            skipped
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{maxVal}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            peak/day
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 6,
  },
  summaryItem: { alignItems: "center", flex: 1, gap: 1 },
  summaryValue: { fontSize: 16, fontWeight: "800" },
  summaryLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryDivider: { width: 1, height: 26 },
});
