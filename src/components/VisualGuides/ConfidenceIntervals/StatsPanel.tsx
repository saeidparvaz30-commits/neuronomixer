"use client";

import React from "react";
import { ConfidenceInterval, ConfidenceLevel, TRUE_MEAN, SAMPLE_N, T_SCORES } from "./types";

interface Props {
  intervals: ConfidenceInterval[];
  confidenceLevel: ConfidenceLevel;
}

export default function StatsPanel({ intervals, confidenceLevel }: Props) {
  if (intervals.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
          Statistics
        </p>
        <p className="text-[11px] text-[#334155]">
          Generate samples to see coverage statistics.
        </p>
      </div>
    );
  }

  const coverCount = intervals.filter((i) => i.containsTruth).length;
  const missCount = intervals.length - coverCount;
  const coverPct = (coverCount / intervals.length) * 100;
  const avgWidth =
    intervals.reduce((a, i) => a + (i.upper - i.lower), 0) / intervals.length;
  const t = T_SCORES[confidenceLevel];
  const diff = Math.abs(coverCount - confidenceLevel);

  const coverColor =
    diff <= 3 ? "#3bb4a4" : coverCount > confidenceLevel ? "var(--color-accent)" : "#f97316";

  const interpretation =
    diff <= 3
      ? `Coverage is close to the nominal ${confidenceLevel}%, which is what the procedure promises over many repetitions.`
      : `Coverage is ${coverCount > confidenceLevel ? "above" : "below"} the nominal ${confidenceLevel}% in this run. With ${intervals.length} intervals, deviations of this size in either direction are ordinary chance variation, not a better or worse procedure.`;

  const rows = [
    { label: "Confidence Level", value: `${confidenceLevel}%`, color: "var(--color-accent)" },
    { label: "Sample Size (n)", value: `${SAMPLE_N}`, color: "#94a3b8" },
    { label: "True Mean (μ)", value: `${TRUE_MEAN}`, color: "#94a3b8" },
    { label: "t critical (df = 29)", value: t.toFixed(3), color: "#94a3b8" },
    {
      label: "Coverage",
      value: `${coverCount} / ${intervals.length}`,
      color: coverColor,
    },
    {
      label: "Coverage %",
      value: `${coverPct.toFixed(0)}%`,
      color: coverColor,
    },
    {
      label: "Miss Count",
      value: `${missCount}`,
      color: missCount > 100 - confidenceLevel + 5 ? "#ef4444" : "#94a3b8",
    },
    { label: "Avg Width", value: avgWidth.toFixed(2), color: "#94a3b8" },
  ];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Summary Statistics
      </p>

      <div className="space-y-2.5">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-[10px] text-[#475569]">{label}</span>
            <span
              className="text-[13px] font-black font-mono"
              style={{ color }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Coverage bar */}
      <div>
        <div className="flex justify-between text-[9px] text-[#475569] mb-1">
          <span>Coverage rate</span>
          <span>{coverPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${coverPct}%`, background: coverColor }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-[#334155] mt-0.5">
          <span>0%</span>
          <span
            className="font-semibold text-[#475569]"
            style={{ marginLeft: `${confidenceLevel}%` }}
          >
            expected {confidenceLevel}%
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* Interpretation */}
      <div
        className="rounded-xl p-3"
        style={{
          background: `color-mix(in srgb, ${coverColor} 6%, transparent)`,
          borderLeft: `3px solid ${coverColor}`,
        }}
      >
        <p className="text-[10px] leading-relaxed text-[#94a3b8]">
          {interpretation}
        </p>
      </div>
    </div>
  );
}
