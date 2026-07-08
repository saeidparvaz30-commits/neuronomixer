"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Granularity,
  READINGS,
  READINGS_END,
  READINGS_START,
  SPIKE_START,
  fmtDate,
  partsFromMs,
  resampleByGranularity,
  utcMs,
} from "./timeModel";

type Props = {
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
};

const GRANULARITIES: Array<{ id: Granularity; label: string }> = [
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
];

const W = 720;
const H = 210;
const M = { top: 14, right: 10, bottom: 24, left: 40 };

export default function ResamplePanel({ granularity, onGranularityChange }: Props) {
  const buckets = useMemo(() => resampleByGranularity(READINGS, granularity), [granularity]);

  // Fixed y-scale across granularities so averaging-away is visible, not hidden
  const hourly = useMemo(() => resampleByGranularity(READINGS, "hourly"), []);
  const daily = useMemo(() => resampleByGranularity(READINGS, "daily"), []);
  const weekly = useMemo(() => resampleByGranularity(READINGS, "weekly"), []);
  const peak = (bs: typeof hourly) =>
    Math.max(...bs.map((b) => (b.mean === null ? 0 : b.mean)));
  const peakHourly = peak(hourly);
  const peakDaily = peak(daily);
  const peakWeekly = peak(weekly);
  const emptyHourly = hourly.filter((b) => b.mean === null).length;
  const yMax = Math.ceil(peakHourly / 100) * 100;

  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const span = READINGS_END - READINGS_START;
  const xOf = (t: number) => M.left + ((t - READINGS_START) / span) * innerW;
  const yOf = (v: number) => M.top + innerH - (v / yMax) * innerH;

  const ticks = [
    utcMs(2024, 3, 25),
    utcMs(2024, 3, 29),
    utcMs(2024, 4, 1),
    utcMs(2024, 4, 5),
  ];

  const nonEmpty = buckets.filter((b) => b.mean !== null);
  const curPeak = peak(buckets);

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Resampling granularity"
        className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1 mb-4"
      >
        {GRANULARITIES.map((g) => {
          const isActive = g.id === granularity;
          return (
            <button
              key={g.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => onGranularityChange(g.id)}
              className={`relative px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="dt-gran-pill"
                  className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{g.label}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[560px]"
          role="img"
          aria-label={`Bar chart of mean requests per minute in ${granularity} buckets. ${nonEmpty.length} of ${buckets.length} buckets contain data. The Mar 29 incident peaks at ${Math.round(curPeak)} at this granularity, against a fixed axis maximum of ${yMax}.`}
        >
          {/* y grid */}
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={yOf(f * yMax)}
                y2={yOf(f * yMax)}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text
                x={M.left - 6}
                y={yOf(f * yMax) + 3}
                textAnchor="end"
                fontSize={9}
                fill="#475569"
              >
                {Math.round(f * yMax)}
              </text>
            </g>
          ))}
          {/* x ticks */}
          {ticks.map((t) => (
            <text
              key={t}
              x={xOf(t)}
              y={H - 8}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
            >
              {fmtDate(partsFromMs(t))}
            </text>
          ))}
          {/* spike marker */}
          <line
            x1={xOf(SPIKE_START)}
            x2={xOf(SPIKE_START)}
            y1={M.top}
            y2={M.top + innerH}
            stroke="var(--color-warning)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={xOf(SPIKE_START) + 4}
            y={M.top + 8}
            fontSize={9}
            fill="var(--color-warning)"
          >
            incident
          </text>
          {/* bars */}
          {buckets.map((b, i) => {
            if (b.mean === null) return null;
            const x = xOf(b.start);
            const bw = Math.max(1, (innerW * (b.end - b.start)) / span - 1);
            return (
              <rect
                key={i}
                x={x}
                y={yOf(b.mean)}
                width={bw}
                height={M.top + innerH - yOf(b.mean)}
                fill="#3bb4a4"
                opacity={0.9}
              />
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {[
          { label: "Peak hourly mean", v: peakHourly, active: granularity === "hourly" },
          { label: "Peak daily mean", v: peakDaily, active: granularity === "daily" },
          { label: "Peak weekly mean", v: peakWeekly, active: granularity === "weekly" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">{s.label}</p>
            <p
              className="text-2xl font-black font-mono"
              style={{ color: s.active ? "var(--color-accent)" : "#f1f5f9" }}
            >
              {Math.round(s.v)}
            </p>
            <p className="text-[10px] text-[#475569] mt-1">requests per minute</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-4">
        All three views aggregate the same {READINGS.length} raw readings; only the bucket
        width changes. The 4-hour incident on Mar 29 reads as a{" "}
        {Math.round(peakHourly)}-high emergency hourly, a mild {Math.round(peakDaily)} bump
        daily, and vanishes into a {Math.round(peakWeekly)} weekly average. None of these
        charts is wrong. Each one answers a different question, which is why the granularity
        of a resample is an aggregation policy you choose, not a detail.
      </p>
      <p className="text-[11px] text-[#475569] leading-relaxed mt-2">
        Also note: on the hourly grid, {emptyHourly} of {hourly.length} slots are empty,
        because readings arrive every 25 to 95 minutes. Resampling finer than your real
        sampling cadence does not create information; it creates gaps. Buckets here are
        aligned to UTC; bucketing by a local calendar would shift every daily boundary by
        that zone&apos;s offset and change the daily numbers.
      </p>
    </div>
  );
}
