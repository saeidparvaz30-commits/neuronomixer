"use client";

import React from "react";
import type { StatsResult } from "./types";

interface DescriptiveStatsProps {
  stats: StatsResult;
  unit: string;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-medium">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function fmt(v: number, unit: string) {
  return `${Number.isInteger(v) ? v : v.toFixed(2)}${unit ? " " + unit : ""}`;
}

export default function DescriptiveStats({ stats, unit }: DescriptiveStatsProps) {
  const { min, q1, median, q3, max, iqr, lowerFence, upperFence, whiskerLower, whiskerUpper, outliers, mean, sd } = stats;

  return (
    <div
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4"
      aria-label="Descriptive statistics summary"
    >
      <h3 className="text-[11px] uppercase tracking-widest text-[#d4af37] font-semibold mb-4">
        Five-Number Summary
      </h3>

      {/* Five-number summary */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <StatItem label="Min" value={fmt(min, unit)} />
        <StatItem label="Q1" value={fmt(q1, unit)} />
        <StatItem label="Median" value={fmt(median, unit)} />
        <StatItem label="Q3" value={fmt(q3, unit)} />
        <StatItem label="Max" value={fmt(max, unit)} />
      </div>

      {/* Divider */}
      <div className="border-t border-[#1e293b] mb-4" />

      {/* IQR & derived */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatItem label="IQR" value={fmt(iqr, unit)} />
        <StatItem label="Mean" value={fmt(mean, unit)} />
        <StatItem label="Std Dev" value={fmt(sd, unit)} />
        <StatItem label="Outliers" value={String(outliers.length)} />
      </div>

      {/* Fences (outlier cutoffs) and whisker ends (extreme inliers) */}
      <div className="grid grid-cols-2 gap-3">
        <StatItem label="Lower Fence" value={fmt(lowerFence, unit)} />
        <StatItem label="Upper Fence" value={fmt(upperFence, unit)} />
        <StatItem label="Lower Whisker" value={fmt(whiskerLower, unit)} />
        <StatItem label="Upper Whisker" value={fmt(whiskerUpper, unit)} />
      </div>

      {/* Outlier values */}
      {outliers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1e293b]">
          <span className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-medium">
            Outlier values:{" "}
          </span>
          <span className="text-xs text-[#ef4444]">
            {outliers.map((v) => fmt(v, unit)).join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}
