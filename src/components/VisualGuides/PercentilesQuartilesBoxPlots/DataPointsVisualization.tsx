"use client";

import React, { useMemo, useId } from "react";
import { motion } from "framer-motion";
import type { StatsResult } from "./types";
import { seededRandom } from "./types";

const VB_W = 800;
const VB_H = 120;
const PAD_L = 40;
const PAD_R = 40;
const PAD_T = 16;
const PAD_B = 28;
const PLOT_W = VB_W - PAD_L - PAD_R;
const AXIS_Y = VB_H - PAD_B;
const SCATTER_CENTER_Y = PAD_T + (AXIS_Y - PAD_T) * 0.45;
const JITTER_RANGE = 18;

interface DataPointsVisualizationProps {
  stats: StatsResult;
  selectedPointIds: Set<number>;
  onPointClick: (pointId: number, value: number) => void;
  unit: string;
  currentStep: number;
}

function toX(value: number, min: number, max: number): number {
  if (max === min) return PAD_L + PLOT_W / 2;
  return PAD_L + ((value - min) / (max - min)) * PLOT_W;
}

export default function DataPointsVisualization({
  stats,
  selectedPointIds,
  onPointClick,
  unit,
  currentStep,
}: DataPointsVisualizationProps) {
  const uid = useId();
  const range = stats.max - stats.min;
  const domainMin = stats.min - range * 0.06;
  const domainMax = stats.max + range * 0.06;

  const points = useMemo(() => {
    return stats.sorted.map((value, i) => {
      const jitter = (seededRandom(i * 11 + 7) - 0.5) * 2 * JITTER_RANGE;
      const isOutlier =
        value < stats.whiskerLower || value > stats.whiskerUpper;
      return { id: i, value, cx: toX(value, domainMin, domainMax), cy: SCATTER_CENTER_Y + jitter, isOutlier };
    });
  }, [stats, domainMin, domainMax]);

  const ticks = useMemo(() => {
    const count = 5;
    const step = (domainMax - domainMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const v = domainMin + i * step;
      return { v, x: toX(v, domainMin, domainMax) };
    });
  }, [domainMin, domainMax]);

  function fmtTick(v: number) {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(0);
  }

  return (
    <div
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4"
      aria-label="Interactive data points visualization"
    >
      <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-3 font-medium">
        All Data Points: click to find percentile rank
      </p>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        role="img"
        aria-label="Scatter plot of all data points, click to find percentile"
        style={{ minHeight: 80 }}
      >
        <defs>
          <clipPath id={`${uid}-dv-clip`}>
            <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={AXIS_Y - PAD_T} />
          </clipPath>
        </defs>

        {/* Axis */}
        <line
          x1={PAD_L}
          y1={AXIS_Y}
          x2={PAD_L + PLOT_W}
          y2={AXIS_Y}
          stroke="#1e293b"
          strokeWidth={1.5}
          aria-hidden="true"
        />

        {/* Ticks */}
        {ticks.map(({ v, x }) => (
          <g key={v} aria-hidden="true">
            <line x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 4} stroke="#475569" strokeWidth={1} />
            <text x={x} y={AXIS_Y + 13} textAnchor="middle" fontSize={8} fill="#475569">
              {fmtTick(v)}
            </text>
          </g>
        ))}

        {/* Q1/Q3 region shading (step 3+) */}
        {currentStep >= 3 && (
          <rect
            x={toX(stats.q1, domainMin, domainMax)}
            y={PAD_T}
            width={toX(stats.q3, domainMin, domainMax) - toX(stats.q1, domainMin, domainMax)}
            height={AXIS_Y - PAD_T}
            fill="#3bb4a4"
            fillOpacity={0.07}
            aria-hidden="true"
          />
        )}

        {/* Points */}
        <g clipPath={`url(#${uid}-dv-clip)`}>
          {points.map((pt) => {
            const isSelected = selectedPointIds.has(pt.id);
            const isOutlier = pt.isOutlier && currentStep >= 4;
            const fill = isSelected ? "#3bb4a4" : isOutlier ? "#ef4444" : "#475569";
            return (
              <motion.circle
                key={pt.id}
                cx={pt.cx}
                cy={pt.cy}
                r={isSelected ? 5 : 3.5}
                fill={fill}
                fillOpacity={isSelected ? 1 : 0.75}
                stroke={isSelected ? "#3bb4a4" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                style={{ cursor: "pointer" }}
                whileHover={{ scale: 1.6, fillOpacity: 1 }}
                animate={{ fill, r: isSelected ? 5 : 3.5 }}
                transition={{ duration: 0.15 }}
                onClick={() => onPointClick(pt.id, pt.value)}
                role="button"
                aria-label={`Value ${pt.value} ${unit}${isSelected ? " (selected)" : ""}`}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
