"use client";

import React from "react";
import { motion } from "framer-motion";
import StatCard from "./StatCard";
import ToggleRobustAlternatives from "./ToggleRobustAlternatives";
import type { ComputedStats } from "./types";

interface StatisticsPanelProps {
  stats: ComputedStats;
  showRobustStats: boolean;
  onToggleRobust: (v: boolean) => void;
  showDistanceViz: boolean;
  onStdDevHover: (hovering: boolean) => void;
}

export default function StatisticsPanel({
  stats,
  showRobustStats,
  onToggleRobust,
  showDistanceViz,
  onStdDevHover,
}: StatisticsPanelProps) {
  const fmt = (n: number, decimals = 1) => n.toFixed(decimals);

  const modeLabel =
    stats.mode === null
      ? "None (all unique)"
      : stats.mode.map((v) => `$${v}k`).join(", ");

  return (
    <div>
      {/* Section: Measures of Center */}
      <div className="mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[2px] text-[#d4af37] mb-3">
          Measures of Center
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            name="Mean (μ)"
            formula="Σx / n"
            value={`$${fmt(stats.mean)}k`}
            description="Sum divided by count. Sensitive to outliers — one extreme salary pulls it far."
          />
          <StatCard
            name="Median (M)"
            formula="middle value"
            value={`$${fmt(stats.median)}k`}
            description="The middle value when sorted. Robust to outliers — great for skewed data."
          />
          <StatCard
            name="Mode"
            formula="most frequent"
            value={modeLabel}
            description="Most frequently occurring value. Useful for categorical or repeated values."
          />
        </div>
      </div>

      {/* Section: Measures of Spread */}
      <div className="mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[2px] text-[#3bb4a4] mb-3">
          Measures of Spread
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            name="Range"
            formula="max − min"
            value={`$${fmt(stats.range)}k`}
            description="Simplest spread measure. Heavily affected by a single outlier at either extreme."
          />
          <StatCard
            name="Variance (σ²)"
            formula="Σ(x − μ)² / n"
            value={`${fmt(stats.variance, 0)}`}
            description="Average squared distance from the mean. Squaring penalises large deviations."
          />
          <motion.div
            layout
            className={`rounded-2xl border p-4 transition-colors duration-200 cursor-pointer ${
              showDistanceViz
                ? "border-[#d4af37]/60 bg-[#1e293b]"
                : "border-[#1e293b] bg-[#0f172a] hover:border-[#d4af37]/40"
            }`}
            onMouseEnter={() => onStdDevHover(true)}
            onMouseLeave={() => onStdDevHover(false)}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-[13px] font-semibold text-white">
                Std Dev (σ)
              </span>
              <span className="text-[18px] font-black text-[#d4af37] tabular-nums">
                ${fmt(stats.stdDev)}k
              </span>
            </div>
            <code className="block text-[10px] text-[#3bb4a4] font-mono mb-2">
              √(σ²)
            </code>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Square root of variance. Same units as data.{" "}
              <span className="text-[#d4af37]/80">
                Hover to see distances on chart.
              </span>
            </p>
          </motion.div>
          <StatCard
            name="IQR"
            formula="Q3 − Q1"
            value={`$${fmt(stats.iqr)}k`}
            description={`Middle 50% range. Q1=$${fmt(stats.q1)}k, Q3=$${fmt(stats.q3)}k. Robust to outliers.`}
          />
        </div>
      </div>

      {/* Robust alternatives toggle */}
      <ToggleRobustAlternatives
        checked={showRobustStats}
        onChange={onToggleRobust}
        trimmedMean={stats.trimmedMean}
        mad={stats.mad}
      />
    </div>
  );
}
