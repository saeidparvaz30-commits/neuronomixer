"use client";

import React from "react";
import { GroupData, mean } from "./types";

interface BoxStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  whiskerLow: number;
  whiskerHigh: number;
}

function computeBoxStats(values: number[]): BoxStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  function quantile(p: number): number {
    const idx = p * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  const q1 = quantile(0.25);
  const median = quantile(0.5);
  const q3 = quantile(0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const inliers = sorted.filter(v => v >= lowerFence && v <= upperFence);
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence);

  const whiskerLow = inliers.length > 0 ? inliers[0] : q1;
  const whiskerHigh = inliers.length > 0 ? inliers[inliers.length - 1] : q3;

  return {
    min: sorted[0],
    q1,
    median,
    q3,
    max: sorted[n - 1],
    outliers,
    whiskerLow,
    whiskerHigh,
  };
}

interface BoxPlotVisualizerProps {
  groups: GroupData[];
  grandMean: number;
  highlightGroup?: string;
}

export default function BoxPlotVisualizer({ groups, grandMean, highlightGroup }: BoxPlotVisualizerProps) {
  const SVG_W = 500;
  const SVG_H = 250;
  const PADDING_LEFT = 44;
  const PADDING_RIGHT = 16;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 44;

  const plotW = SVG_W - PADDING_LEFT - PADDING_RIGHT;
  const plotH = SVG_H - PADDING_TOP - PADDING_BOTTOM;

  // Compute all stats
  const allStats = groups.map(g => computeBoxStats(g.values));
  const allValues = groups.flatMap(g => g.values);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin || 1;
  const yMin = dataMin - range * 0.1;
  const yMax = dataMax + range * 0.1;
  const yRange = yMax - yMin;

  function yScale(val: number): number {
    return PADDING_TOP + plotH - ((val - yMin) / yRange) * plotH;
  }

  const boxWidth = Math.min(40, (plotW / groups.length) * 0.5);
  const groupSlotW = plotW / groups.length;

  // Y-axis ticks
  const tickCount = 5;
  const tickStep = (yMax - yMin) / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => yMin + i * tickStep);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <h2 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-4">
        Distribution by Group
      </h2>
      <div className="w-full">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Box plot showing distribution of scores for each teaching method"
        >
          {/* Y-axis gridlines and labels */}
          {ticks.map((tick, i) => {
            const y = yScale(tick);
            return (
              <g key={i}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={SVG_W - PADDING_RIGHT}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
                <text
                  x={PADDING_LEFT - 6}
                  y={y + 5}
                  textAnchor="end"
                  fill="#475569"
                  fontSize={16}
                  fontFamily="monospace"
                >
                  {tick.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Grand mean dashed line */}
          <line
            x1={PADDING_LEFT}
            y1={yScale(grandMean)}
            x2={SVG_W - PADDING_RIGHT}
            y2={yScale(grandMean)}
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            strokeDasharray="4,3"
            opacity={0.7}
          />
          <text
            x={SVG_W - PADDING_RIGHT + 2}
            y={yScale(grandMean) + 4}
            fill="var(--color-accent)"
            fontSize={16}
          >
            x̄
          </text>

          {/* Box plots */}
          {groups.map((g, gi) => {
            const stats = allStats[gi];
            const cx = PADDING_LEFT + groupSlotW * gi + groupSlotW / 2;
            const isHighlighted = !highlightGroup || highlightGroup === g.groupName;
            const opacity = isHighlighted ? 1 : 0.3;

            const yQ1 = yScale(stats.q1);
            const yQ3 = yScale(stats.q3);
            const yMedian = yScale(stats.median);
            const yWhiskerLow = yScale(stats.whiskerLow);
            const yWhiskerHigh = yScale(stats.whiskerHigh);

            return (
              <g key={g.groupName} opacity={opacity}>
                <title>
                  {g.groupName}: Median={stats.median.toFixed(1)}, Q1={stats.q1.toFixed(1)}, Q3={stats.q3.toFixed(1)}, Whiskers (within 1.5×IQR)=[{stats.whiskerLow.toFixed(1)}, {stats.whiskerHigh.toFixed(1)}]{stats.outliers.length > 0 ? `, ${stats.outliers.length} outlier${stats.outliers.length > 1 ? "s" : ""}` : ""}
                </title>

                {/* Whisker lines */}
                <line
                  x1={cx}
                  y1={yQ3}
                  x2={cx}
                  y2={yWhiskerHigh}
                  stroke={g.color}
                  strokeWidth={1.5}
                  strokeDasharray="2,2"
                />
                <line
                  x1={cx}
                  y1={yQ1}
                  x2={cx}
                  y2={yWhiskerLow}
                  stroke={g.color}
                  strokeWidth={1.5}
                  strokeDasharray="2,2"
                />

                {/* Whisker caps */}
                <line x1={cx - boxWidth / 3} y1={yWhiskerHigh} x2={cx + boxWidth / 3} y2={yWhiskerHigh} stroke={g.color} strokeWidth={1.5} />
                <line x1={cx - boxWidth / 3} y1={yWhiskerLow} x2={cx + boxWidth / 3} y2={yWhiskerLow} stroke={g.color} strokeWidth={1.5} />

                {/* IQR box */}
                <rect
                  x={cx - boxWidth / 2}
                  y={yQ3}
                  width={boxWidth}
                  height={Math.abs(yQ1 - yQ3)}
                  fill={g.color}
                  fillOpacity={0.2}
                  stroke={g.color}
                  strokeWidth={1.5}
                  rx={2}
                />

                {/* Median line */}
                <line
                  x1={cx - boxWidth / 2}
                  y1={yMedian}
                  x2={cx + boxWidth / 2}
                  y2={yMedian}
                  stroke={g.color}
                  strokeWidth={2.5}
                />

                {/* Outlier dots */}
                {stats.outliers.map((val, oi) => (
                  <circle
                    key={oi}
                    cx={cx}
                    cy={yScale(val)}
                    r={3}
                    fill="none"
                    stroke={g.color}
                    strokeWidth={1.5}
                    opacity={0.7}
                  />
                ))}

                {/* Group label */}
                <text
                  x={cx}
                  y={SVG_H - PADDING_BOTTOM + 16}
                  textAnchor="middle"
                  fill={g.color}
                  fontSize={17}
                  fontWeight="600"
                >
                  {g.groupName}
                </text>
                <text
                  x={cx}
                  y={SVG_H - PADDING_BOTTOM + 34}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize={16}
                  fontFamily="monospace"
                >
                  x̄={mean(g.values).toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Y-axis border */}
          <line
            x1={PADDING_LEFT}
            y1={PADDING_TOP}
            x2={PADDING_LEFT}
            y2={PADDING_TOP + plotH}
            stroke="#1e293b"
            strokeWidth={1}
          />
        </svg>
      </div>

      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px border-t border-dashed border-[var(--color-accent)]" />
          <span className="text-[10px] text-[#94a3b8]">Grand mean</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border border-[#3bb4a4] bg-[#3bb4a4]/20 rounded-sm" />
          <span className="text-[10px] text-[#94a3b8]">IQR box</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-[#3bb4a4]" />
          <span className="text-[10px] text-[#94a3b8]">Median</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[#475569] leading-relaxed">
        One-way ANOVA assumes independent observations, approximately normal
        residuals within each group, and roughly equal group variances. Check
        the box plots above for badly skewed groups or very unequal spreads
        before trusting the F-test.
      </p>
    </div>
  );
}
