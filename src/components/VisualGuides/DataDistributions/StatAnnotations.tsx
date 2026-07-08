"use client";

import React from "react";
import { DistStats } from "./types";

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function StatRow({ label, value, sub, color = "#f1f5f9" }: StatRowProps) {
  return (
    <div className="rounded-xl border border-[#1e293b] p-3 bg-[#0a0e1a]/40">
      <p className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#475569] mb-0.5">{label}</p>
      <p className="text-[15px] font-black font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[9px] text-[#334155] mt-0.5">{sub}</p>}
    </div>
  );
}

function SkewnessBadge({ label }: { label: string }) {
  const color =
    label === "Symmetric" ? "#3bb4a4"
    : label.startsWith("Right") ? "#f97316"
    : label.startsWith("Left")  ? "#a855f7"
    : "#94a3b8";
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color }}
    >
      {label}
    </span>
  );
}

interface Props {
  stats: DistStats;
  color: string;
}

export default function StatAnnotations({ stats, color }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Distribution Statistics
      </p>

      <div className="rounded-xl border border-[#1e293b] p-3 bg-[#0a0e1a]/40 space-y-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#475569]">Formula</p>
        <p className="text-[13px] font-black font-mono" style={{ color }}>{stats.formula}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatRow label="Mean" value={stats.mean.toFixed(2)} color={color} />
        <StatRow label="Median" value={stats.median.toFixed(2)} color="#3bb4a4" />
        <StatRow label="Std Dev (σ)" value={stats.stdDev.toFixed(2)} color={color} />
        <StatRow
          label="Plot window"
          value={`${stats.min.toFixed(1)} – ${stats.max.toFixed(1)}`}
          color="#94a3b8"
        />
      </div>

      <div className="rounded-xl border border-[#1e293b] p-3 bg-[#0a0e1a]/40">
        <p className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#475569] mb-1.5">Skewness</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-black font-mono" style={{ color }}>
            {stats.skewness.toFixed(2)}
          </p>
          <SkewnessBadge label={stats.skewnessLabel} />
        </div>
      </div>

      <div className="rounded-xl border border-[#1e293b] p-3 bg-[#0a0e1a]/40">
        <p className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#475569] mb-1.5">Kurtosis</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-black font-mono" style={{ color }}>
            {stats.kurtosis.toFixed(2)}
          </p>
          <span
            className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold"
            style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color }}
          >
            {stats.kurtosisLabel}
          </span>
        </div>
        <p className="text-[9px] text-[#334155] mt-1">
          {stats.kurtosis < 3 ? "Lighter tails than Normal" : stats.kurtosis === 3 ? "Normal-weight tails" : "Heavier tails than Normal"}
        </p>
      </div>
    </div>
  );
}
