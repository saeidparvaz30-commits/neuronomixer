"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  T,
  BASELINE_WINDOW,
  METRIC_KEYS,
  MetricKey,
  CusumRun,
  DetectionStats,
} from "./math";
import { METRIC_META, APPLIED_AI_PINK } from "./types";
import { xScale, yScale, linePath } from "./chartUtils";

const CHART_W = 680;
const CHART_H = 150;

type Props = {
  metric: MetricKey;
  onMetricChange: (m: MetricKey) => void;
  h: number;
  k: number;
  onHChange: (h: number) => void;
  onKChange: (k: number) => void;
  cusum: CusumRun;
  /** From classifyAlarms: detectionDelay is non-null only for a genuine catch. */
  stats: DetectionStats;
  onset: number;
  injected: boolean;
  /** Whether the injected scenario actually shifts the monitored metric. */
  shifted: boolean;
};

export default function DetectorPanel({
  metric,
  onMetricChange,
  h,
  k,
  onHChange,
  onKChange,
  cusum,
  stats,
  onset,
  injected,
  shifted,
}: Props) {
  const meta = METRIC_META[metric];
  const ext = { min: 0, max: Math.max(h * 1.35, ...cusum.stat) * 1.05 };
  const statPath = linePath(cusum.stat, ext, CHART_W, CHART_H);
  const hY = yScale(h, ext, CHART_H);
  const onsetX = xScale(onset, T, CHART_W);
  const baselineEndX = xScale(BASELINE_WINDOW, T, CHART_W);

  const detected = stats.detectionDelay !== null;
  const missed = shifted && !detected;

  return (
    <div>
      {/* Metric selector */}
      <div
        className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1 mb-3"
        role="radiogroup"
        aria-label="Metric the CUSUM detector monitors"
      >
        {METRIC_KEYS.map((m) => {
          const isActive = metric === m;
          return (
            <button
              key={m}
              role="radio"
              aria-checked={isActive}
              onClick={() => onMetricChange(m)}
              className={`relative px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="monitor-metric-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "var(--color-accent)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{METRIC_META[m].label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
        {meta.description}
      </p>

      {/* The math, spelled out */}
      <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-3">
{`One-sided tabular CUSUM (${meta.label}, ${
  metric === "judge" ? "watching for drops" : "watching for rises"
}):

  z_t = ${metric === "judge" ? "-" : ""}(x_t - mu0) / sigma0     deviation from baseline, in sigmas
  S_t = max(0, S_t-1 + z_t - k)     accumulate anything beyond the slack k
  alarm when S_t > h, then S resets to 0

baseline from hours 0 to ${BASELINE_WINDOW - 1}:  mu0 = ${cusum.mu0.toFixed(
  metric === "judge" || metric === "refusal" ? 4 : 1
)}, sigma0 = ${cusum.sigma0.toFixed(
  metric === "judge" || metric === "refusal" ? 4 : 1
)}`}
      </pre>

      {/* Detector knobs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="threshold-slider"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5"
          >
            Alarm threshold h:{" "}
            <span className="font-mono text-white">{h.toFixed(1)}</span>
          </label>
          <input
            id="threshold-slider"
            type="range"
            min={0.5}
            max={12}
            step={0.5}
            value={h}
            onChange={(e) => onHChange(Number(e.target.value))}
            className="w-full accent-[#ec4899]"
          />
        </div>
        <div>
          <label
            htmlFor="slack-slider"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5"
          >
            Slack k (sigmas ignored per hour):{" "}
            <span className="font-mono text-white">{k.toFixed(1)}</span>
          </label>
          <input
            id="slack-slider"
            type="range"
            min={0.1}
            max={1.5}
            step={0.1}
            value={k}
            onChange={(e) => onKChange(Number(e.target.value))}
            className="w-full accent-[#ec4899]"
          />
        </div>
      </div>

      {/* CUSUM chart */}
      <div className="rounded-xl border border-[#1e293b] p-3 mb-3">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`CUSUM statistic for ${meta.label} over ${T} hours with alarm threshold ${h}. ${
            stats.falseAlarms.length
          } false alarm${stats.falseAlarms.length === 1 ? "" : "s"}. ${
            detected
              ? `Regression detected ${stats.detectionDelay} hours after onset.`
              : missed
                ? "Regression not detected in this window."
                : injected
                  ? "The injected incident does not shift this metric."
                  : "No regression injected."
          }`}
        >
          <rect
            x={0}
            y={0}
            width={baselineEndX}
            height={CHART_H}
            fill="#1e293b"
            opacity={0.35}
          />
          {injected && (
            <line
              x1={onsetX}
              y1={0}
              x2={onsetX}
              y2={CHART_H}
              stroke={APPLIED_AI_PINK}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
          <line
            x1={0}
            y1={hY}
            x2={CHART_W}
            y2={hY}
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <path d={statPath} fill="none" stroke={meta.color} strokeWidth={1.5} />
          {cusum.alarms.map((a) => {
            const ax = xScale(a, T, CHART_W);
            const isFalse = stats.falseAlarms.includes(a);
            return (
              <g key={a}>
                <line
                  x1={ax}
                  y1={0}
                  x2={ax}
                  y2={CHART_H}
                  stroke={isFalse ? "#ef4444" : "var(--color-success)"}
                  strokeWidth={1}
                  opacity={0.5}
                />
                <circle
                  cx={ax}
                  cy={hY}
                  r={4}
                  fill={isFalse ? "#ef4444" : "var(--color-success)"}
                />
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <span className="text-[10px] text-[#475569]">
            <span style={{ color: meta.color }}>&#9644;</span> CUSUM statistic
            S_t
          </span>
          <span className="text-[10px] text-[#475569]">
            <span className="text-[var(--color-accent)]">&#9476;</span>{" "}
            threshold h
          </span>
          <span className="text-[10px] text-[#475569]">
            <span style={{ color: APPLIED_AI_PINK }}>&#9476;</span> regression
            onset
          </span>
          <span className="text-[10px] text-[#475569]">
            <span className="text-[var(--color-success)]">&#9679;</span> true
            alarm (caught the injected regression)
          </span>
          <span className="text-[10px] text-[#475569]">
            <span className="text-[#ef4444]">&#9679;</span> false alarm
          </span>
        </div>
      </div>

      {/* Readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-live="polite">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Detection delay
          </p>
          <p
            className={`text-xl font-black font-mono ${
              detected
                ? "text-[var(--color-success)]"
                : missed
                  ? "text-[var(--color-warning)]"
                  : "text-[#475569]"
            }`}
          >
            {detected
              ? `${stats.detectionDelay} h`
              : missed
                ? "missed"
                : "n/a"}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {detected
              ? `first alarm at hour ${stats.detectionHour}, onset at hour ${onset}`
              : missed
                ? "no alarm at or after the onset in this window"
                : injected
                  ? "the injected incident does not shift this metric"
                  : "inject a regression first"}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            False alarms
          </p>
          <p
            className={`text-xl font-black font-mono ${
              stats.falseAlarms.length > 0 ? "text-[#ef4444]" : "text-[#f1f5f9]"
            }`}
          >
            {stats.falseAlarms.length}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {stats.falseAlarms.length > 0
              ? `at hour${stats.falseAlarms.length === 1 ? "" : "s"} ${stats.falseAlarms.join(", ")}, with no real shift on this metric to explain them`
              : "the detector stayed quiet while things were healthy"}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Total alarms
          </p>
          <p className="text-xl font-black font-mono text-[#f1f5f9]">
            {cusum.alarms.length}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            each alarm resets the statistic, like an on-call ack
          </p>
        </div>
      </div>
    </div>
  );
}
