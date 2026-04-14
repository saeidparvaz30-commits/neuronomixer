"use client";

import React from "react";
import { effectSizeLabel } from "./types";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const MARKERS = [
  { v: 0.2, label: "Small" },
  { v: 0.5, label: "Medium" },
  { v: 0.8, label: "Large" },
  { v: 1.2, label: "Very Large" },
];

export default function EffectSizeSlider({ value, onChange }: Props) {
  const label = effectSizeLabel(value);
  const pct = ((value - 0.1) / (2.0 - 0.1)) * 100;

  const labelColor =
    value < 0.2
      ? "#475569"
      : value < 0.5
      ? "#94a3b8"
      : value < 0.8
      ? "#3bb4a4"
      : "#d4af37";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Effect Size (Cohen&apos;s d)
        </p>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ background: labelColor + "22", color: labelColor }}
          >
            {label}
          </span>
          <span className="text-[14px] font-bold font-mono text-[#d4af37]">
            {value.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Slider with gold fill */}
      <div className="relative mb-1">
        <div className="relative h-2 rounded-full bg-[#1e293b] overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[#d4af37]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={0.1}
          max={2.0}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Cohen's d effect size"
          aria-valuenow={value}
          aria-valuemin={0.1}
          aria-valuemax={2.0}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
        />
        {/* Visible thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#d4af37] border-2 border-[#0f172a] shadow-md pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>

      {/* Marker labels */}
      <div className="relative mt-3 mb-1 flex justify-between px-0">
        {MARKERS.map(({ v, label: ml }) => {
          const mp = ((v - 0.1) / (2.0 - 0.1)) * 100;
          return (
            <div
              key={v}
              className="absolute flex flex-col items-center"
              style={{ left: `${mp}%`, transform: "translateX(-50%)" }}
            >
              <div className="w-px h-2 bg-[#334155] mb-0.5" />
              <span className="text-[9px] text-[#475569] whitespace-nowrap">{ml}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-[11px] text-[#94a3b8] leading-relaxed">
        <strong className="text-white">Cohen&apos;s d</strong> measures the standardized difference
        between two group means: d = (μ₂ − μ₁) / σ. A value of 0.5 means the groups differ
        by half a standard deviation.
      </div>
    </div>
  );
}
