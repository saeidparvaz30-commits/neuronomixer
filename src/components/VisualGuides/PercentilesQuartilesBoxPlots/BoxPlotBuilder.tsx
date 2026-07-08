"use client";

import React, { useMemo, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StatsResult, StepType } from "./types";
import { seededRandom } from "./types";

// ── SVG layout constants ──────────────────────────────────────────────────────
const VB_W = 800;
const VB_H = 200;
const PAD_L = 40;
const PAD_R = 40;
const PAD_T = 24;
const PAD_B = 32;
const PLOT_W = VB_W - PAD_L - PAD_R;
const SCATTER_CENTER_Y = PAD_T + (VB_H - PAD_T - PAD_B) * 0.35;
const BOX_TOP = PAD_T + (VB_H - PAD_T - PAD_B) * 0.15;
const BOX_BOTTOM = PAD_T + (VB_H - PAD_T - PAD_B) * 0.58;
const BOX_H = BOX_BOTTOM - BOX_TOP;
const AXIS_Y = VB_H - PAD_B;
const JITTER_RANGE = 22;

interface BoxPlotBuilderProps {
  currentStep: StepType;
  stats: StatsResult;
  showZScores: boolean;
  selectedPointIds: Set<number>;
  onPointClick: (pointId: number, value: number) => void;
  unit: string;
}

interface PointData {
  id: number;
  value: number;
  cx: number;
  cy: number;
  isOutlier: boolean;
}

interface Domain {
  min: number;
  max: number;
  isZ: boolean;
}

function toSvgX(value: number, dMin: number, dMax: number): number {
  if (dMax === dMin) return PAD_L + PLOT_W / 2;
  return PAD_L + ((value - dMin) / (dMax - dMin)) * PLOT_W;
}

function toZScore(value: number, mean: number, sd: number): number {
  return sd === 0 ? 0 : (value - mean) / sd;
}

export default function BoxPlotBuilder({
  currentStep,
  stats,
  showZScores,
  selectedPointIds,
  onPointClick,
  unit,
}: BoxPlotBuilderProps) {
  const uid = useId();

  // ── Axis domain ──────────────────────────────────────────────────────────
  const domain: Domain = useMemo(() => {
    if (showZScores && currentStep === 5) {
      const zMin = toZScore(stats.min, stats.mean, stats.sd);
      const zMax = toZScore(stats.max, stats.mean, stats.sd);
      const pad = (zMax - zMin) * 0.1;
      return { min: zMin - pad, max: zMax + pad, isZ: true };
    }
    const range = stats.max - stats.min;
    const pad = range * 0.08;
    return { min: stats.min - pad, max: stats.max + pad, isZ: false };
  }, [stats, showZScores, currentStep]);

  const toX = useCallback(
    (v: number) => toSvgX(v, domain.min, domain.max),
    [domain]
  );

  const rawToX = useCallback(
    (raw: number) => {
      const v = domain.isZ ? toZScore(raw, stats.mean, stats.sd) : raw;
      return toX(v);
    },
    [domain, stats, toX]
  );

  // ── Scatter points ───────────────────────────────────────────────────────
  const points: PointData[] = useMemo(() => {
    return stats.sorted.map((value, i) => {
      const jitter = (seededRandom(i * 7 + 13) - 0.5) * 2 * JITTER_RANGE;
      const isOutlier = value < stats.whiskerLower || value > stats.whiskerUpper;
      return { id: i, value, cx: rawToX(value), cy: SCATTER_CENTER_Y + jitter, isOutlier };
    });
  }, [stats, rawToX]);

  // ── Axis ticks ───────────────────────────────────────────────────────────
  const ticks = useMemo(() => {
    const count = 6;
    const step = (domain.max - domain.min) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const v = domain.min + i * step;
      return { v, x: toX(v) };
    });
  }, [domain, toX]);

  function formatTick(v: number): string {
    if (domain.isZ) return v.toFixed(1);
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1);
  }

  function fmt(v: number): string {
    if (domain.isZ) return v.toFixed(2);
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }

  // ── Key x-positions ──────────────────────────────────────────────────────
  const medX = rawToX(stats.median);
  const q1X = rawToX(stats.q1);
  const q3X = rawToX(stats.q3);
  const wLowX = rawToX(stats.whiskerLower);
  const wHighX = rawToX(stats.whiskerUpper);
  const whiskerMidY = (BOX_TOP + BOX_BOTTOM) / 2;
  const zNeg1X = toX(-1);
  const zPos1X = toX(1);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        role="img"
        aria-label={`Box plot builder, step ${currentStep}`}
        style={{ minHeight: 160 }}
      >
        <defs>
          <clipPath id={`${uid}-clip`}>
            <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={AXIS_Y - PAD_T} />
          </clipPath>
          <linearGradient id={`${uid}-zbg`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#3bb4a4" stopOpacity={0.05} />
            <stop offset="50%" stopColor="#3bb4a4" stopOpacity={0.13} />
            <stop offset="100%" stopColor="#3bb4a4" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        {/* ── Axis line ── */}
        <line
          x1={PAD_L}
          y1={AXIS_Y}
          x2={PAD_L + PLOT_W}
          y2={AXIS_Y}
          stroke="#1e293b"
          strokeWidth={1.5}
          aria-hidden="true"
        />

        {/* ── Ticks ── */}
        {ticks.map(({ v, x }) => (
          <g key={v} aria-hidden="true">
            <line x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 4} stroke="#475569" strokeWidth={1} />
            <text x={x} y={AXIS_Y + 14} textAnchor="middle" fontSize={9} fill="#475569">
              {formatTick(v)}
            </text>
          </g>
        ))}

        {/* ── Axis label ── */}
        <text
          x={PAD_L + PLOT_W / 2}
          y={VB_H - 2}
          textAnchor="middle"
          fontSize={9}
          fill="#475569"
          aria-hidden="true"
        >
          {domain.isZ ? "Z-Score (standard deviations from mean)" : unit}
        </text>

        {/* ── Step 5: Z-score ±1σ shaded band ── */}
        <AnimatePresence>
          {currentStep === 5 && showZScores && (
            <motion.rect
              key="zband"
              x={zNeg1X}
              y={PAD_T}
              width={Math.max(0, zPos1X - zNeg1X)}
              height={AXIS_Y - PAD_T}
              fill={`url(#${uid}-zbg)`}
              stroke="#3bb4a4"
              strokeOpacity={0.18}
              strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="68% region: ±1 standard deviation"
            />
          )}
        </AnimatePresence>

        {/* ── Step 5: Z-score band labels ── */}
        <AnimatePresence>
          {currentStep === 5 && showZScores && (
            <motion.g
              key="z-labels"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Z-score reference labels"
            >
              <text x={zNeg1X} y={BOX_TOP - 4} textAnchor="middle" fontSize={9} fill="#3bb4a4" fontWeight="600">
                -1σ
              </text>
              <text x={zPos1X} y={BOX_TOP - 4} textAnchor="middle" fontSize={9} fill="#3bb4a4" fontWeight="600">
                +1σ
              </text>
              <text x={toX(0)} y={BOX_TOP - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
                0
              </text>
              <line
                x1={toX(0)}
                y1={PAD_T}
                x2={toX(0)}
                y2={AXIS_Y}
                stroke="#475569"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Scatter points ── */}
        <g clipPath={`url(#${uid}-clip)`} aria-label="Scatter plot of data points">
          {points.map((pt) => {
            const isSelected = selectedPointIds.has(pt.id);
            const isOutlierStep4Plus = pt.isOutlier && currentStep >= 4;
            const fill = isSelected
              ? "#3bb4a4"
              : isOutlierStep4Plus
              ? "#ef4444"
              : "#475569";
            const r = isSelected ? 5.5 : 4;
            return (
              <motion.circle
                key={pt.id}
                cx={pt.cx}
                cy={pt.cy}
                r={r}
                fill={fill}
                fillOpacity={isSelected ? 1 : 0.7}
                stroke={isSelected ? "#3bb4a4" : "none"}
                strokeWidth={isSelected ? 1.5 : 0}
                style={{ cursor: "pointer" }}
                whileHover={{ scale: 1.5, fillOpacity: 1 }}
                animate={{ r, fill }}
                transition={{ duration: 0.15 }}
                onClick={() => onPointClick(pt.id, pt.value)}
                role="button"
                aria-label={`Data point: ${pt.value} ${unit}`}
              />
            );
          })}
        </g>

        {/* ── Step 2+: Median line ── */}
        <AnimatePresence>
          {currentStep >= 2 && (
            <motion.g
              key="median"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0 }}
              style={{ originY: (BOX_TOP + BOX_BOTTOM) / 2 }}
              aria-label={`Median: ${fmt(stats.median)} ${unit}`}
            >
              <line
                x1={medX}
                y1={BOX_TOP - 8}
                x2={medX}
                y2={BOX_BOTTOM + 8}
                stroke="#ef4444"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <text
                x={medX}
                y={BOX_TOP - 12}
                textAnchor="middle"
                fontSize={9}
                fill="#ef4444"
                fontWeight="600"
              >
                Median={fmt(stats.median)}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 3+: IQR box ── */}
        <AnimatePresence>
          {currentStep >= 3 && (
            <motion.g
              key="iqr-box"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label={`IQR box from Q1=${fmt(stats.q1)} to Q3=${fmt(stats.q3)}`}
            >
              {/* Filled box */}
              <motion.rect
                x={q1X}
                y={BOX_TOP}
                width={Math.max(0, q3X - q1X)}
                height={BOX_H}
                fill="#3bb4a4"
                fillOpacity={0.15}
                stroke="#3bb4a4"
                strokeOpacity={0.4}
                strokeWidth={1.5}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                style={{ transformOrigin: `${q1X + (q3X - q1X) / 2}px ${(BOX_TOP + BOX_BOTTOM) / 2}px` }}
                transition={{ duration: 0.35 }}
              />
              {/* Q1 line */}
              <motion.line
                x1={q1X}
                y1={BOX_TOP}
                x2={q1X}
                y2={BOX_BOTTOM}
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{ transformOrigin: `${q1X}px ${(BOX_TOP + BOX_BOTTOM) / 2}px` }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />
              {/* Q3 line */}
              <motion.line
                x1={q3X}
                y1={BOX_TOP}
                x2={q3X}
                y2={BOX_BOTTOM}
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{ transformOrigin: `${q3X}px ${(BOX_TOP + BOX_BOTTOM) / 2}px` }}
                transition={{ duration: 0.3, delay: 0.2 }}
              />
              {/* Q1 label */}
              <text x={q1X - 3} y={BOX_TOP - 5} textAnchor="end" fontSize={9} fill="var(--color-accent)" fontWeight="600">
                Q1={fmt(stats.q1)}
              </text>
              {/* Q3 label */}
              <text x={q3X + 3} y={BOX_TOP - 5} textAnchor="start" fontSize={9} fill="var(--color-accent)" fontWeight="600">
                Q3={fmt(stats.q3)}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 4+: Whiskers ── */}
        <AnimatePresence>
          {currentStep >= 4 && (
            <motion.g
              key="whiskers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Box plot whiskers"
            >
              {/* Lower whisker */}
              <motion.line
                x1={wLowX}
                y1={whiskerMidY}
                x2={q1X}
                y2={whiskerMidY}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeLinecap="round"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                style={{ transformOrigin: `${q1X}px ${whiskerMidY}px` }}
                transition={{ duration: 0.3 }}
              />
              {/* Lower cap */}
              <line
                x1={wLowX}
                y1={BOX_TOP + BOX_H * 0.2}
                x2={wLowX}
                y2={BOX_BOTTOM - BOX_H * 0.2}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeLinecap="round"
              />
              {/* Upper whisker */}
              <motion.line
                x1={q3X}
                y1={whiskerMidY}
                x2={wHighX}
                y2={whiskerMidY}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeLinecap="round"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                style={{ transformOrigin: `${q3X}px ${whiskerMidY}px` }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />
              {/* Upper cap */}
              <line
                x1={wHighX}
                y1={BOX_TOP + BOX_H * 0.2}
                x2={wHighX}
                y2={BOX_BOTTOM - BOX_H * 0.2}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Step info box */}
      <StepInfoBox step={currentStep} stats={stats} showZScores={showZScores} unit={unit} fmt={fmt} />
    </div>
  );
}

// ── Step info boxes ────────────────────────────────────────────────────────────

interface InfoBoxProps {
  step: StepType;
  stats: StatsResult;
  showZScores: boolean;
  unit: string;
  fmt: (v: number) => string;
}

function StepInfoBox({ step, stats, showZScores, unit, fmt }: InfoBoxProps) {
  const content = (): React.ReactNode => {
    switch (step) {
      case 1:
        return (
          <>
            <span className="font-semibold text-white">Raw data scattered on axis.</span>{" "}
            <span className="text-[#94a3b8]">
              Mean = {fmt(stats.mean)} {unit}, SD = {fmt(stats.sd)} {unit}.{" "}
              {stats.n} data points plotted with vertical jitter to reduce overlap. Click any point to find its percentile.
            </span>
          </>
        );
      case 2:
        return (
          <>
            <span className="font-semibold text-[#ef4444]">Median = {fmt(stats.median)} {unit}.</span>{" "}
            <span className="text-[#94a3b8]">
              The middle value when data is sorted. Half the data falls below this line, half above.
            </span>
          </>
        );
      case 3:
        return (
          <>
            <span className="font-semibold text-[var(--color-accent)]">
              Q1 = {fmt(stats.q1)} {unit}, Q3 = {fmt(stats.q3)} {unit}, IQR = {fmt(stats.iqr)} {unit}.
            </span>{" "}
            <span className="text-[#94a3b8]">
              The box spans the middle 50% of data. Q1 is the 25th percentile; Q3 is the 75th percentile.
            </span>
          </>
        );
      case 4:
        return (
          <>
            <span className="font-semibold text-[#94a3b8]">
              Whiskers extend to the most extreme data points still within 1.5×IQR of the box.
            </span>{" "}
            <span className="text-[#94a3b8]">
              Whisker ends: {fmt(stats.whiskerLower)} / {fmt(stats.whiskerUpper)} {unit}. Fences
              (outlier cutoffs at Q1/Q3 ± 1.5×IQR): {fmt(stats.lowerFence)} / {fmt(stats.upperFence)} {unit}.{" "}
            </span>
            {stats.outliers.length > 0 ? (
              <span className="text-[#ef4444]">
                {stats.outliers.length} outlier{stats.outliers.length > 1 ? "s" : ""} detected (red points).
              </span>
            ) : (
              <span className="text-[#3bb4a4]">No outliers detected.</span>
            )}
          </>
        );
      case 5:
        return showZScores ? (
          <>
            <span className="font-semibold text-[#3bb4a4]">Z-Score view active.</span>{" "}
            <span className="text-[#94a3b8]">
              X-axis now shows standard deviations from the mean (z = (x − μ) / σ). The shaded band covers ~68% of
              normally distributed data within ±1σ. Box plot shape is preserved. Only the scale changes.
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold text-white">Toggle Z-Scores above</span>{" "}
            <span className="text-[#94a3b8]">
              to rescale the axis to standard deviations. This standardizes data to mean = 0, SD = 1,
              enabling comparison of datasets with different units on a single scale.
            </span>
          </>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${step}-${showZScores}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="mt-3 rounded-xl bg-[#1e293b] px-4 py-3 text-[12px] leading-relaxed"
        role="status"
        aria-live="polite"
      >
        {content()}
      </motion.div>
    </AnimatePresence>
  );
}
