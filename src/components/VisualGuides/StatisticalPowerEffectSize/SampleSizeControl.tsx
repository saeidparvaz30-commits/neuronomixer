"use client";

import React from "react";

interface Props {
  value: number;
  computedPower: number;
  onChange: (v: number) => void;
}

function powerColor(p: number): string {
  if (p >= 0.9) return "#22c55e";
  if (p >= 0.8) return "#3bb4a4";
  if (p >= 0.6) return "#d4af37";
  return "#ef4444";
}

export default function SampleSizeControl({ value, computedPower, onChange }: Props) {
  const pct = ((value - 10) / (500 - 10)) * 100;
  const color = powerColor(computedPower);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Sample Size per Group
        </p>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ background: color + "22", color }}
          >
            Power = {computedPower.toFixed(2)}
          </span>
          <span className="text-[14px] font-bold font-mono text-white">
            n = {value}
          </span>
        </div>
      </div>

      <div className="relative mb-1">
        <div className="relative h-2 rounded-full bg-[#1e293b] overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <input
          type="range"
          min={10}
          max={500}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Sample size per group"
          aria-valuenow={value}
          aria-valuemin={10}
          aria-valuemax={500}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#0f172a] shadow-md pointer-events-none"
          style={{
            left: `calc(${pct}% - 8px)`,
            background: color,
          }}
        />
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {[20, 50, 100, 200, 500].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
              value === n
                ? "bg-[#d4af37] text-[#0a0e1a]"
                : "border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
            }`}
          >
            n={n}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-[#475569] leading-relaxed">
        Total participants = n × 2 (two groups). Every power number in this guide is for the
        two-sample comparison; a one-sample test with the same n has different power, so do not
        reuse these values for it.
      </p>
    </div>
  );
}
