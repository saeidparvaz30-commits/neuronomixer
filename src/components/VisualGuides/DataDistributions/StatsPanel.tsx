"use client";

import React from "react";
import { motion } from "framer-motion";
import { computeStats } from "./types";

interface Props {
  data: number[];
  color: string;
  showMean: boolean;
  showMedian: boolean;
  showStd: boolean;
  onToggleMean: () => void;
  onToggleMedian: () => void;
  onToggleStd: () => void;
}

export default function StatsPanel({
  data, color,
  showMean, showMedian, showStd,
  onToggleMean, onToggleMedian, onToggleStd,
}: Props) {
  const stats = computeStats(data);

  const metrics = [
    { key: "mean",   label: "Mean (μ)",   value: stats.mean.toFixed(2),   color: "#3b82f6", toggle: onToggleMean,   active: showMean },
    { key: "median", label: "Median",     value: stats.median.toFixed(2), color: "#3bb4a4", toggle: onToggleMedian, active: showMedian },
    { key: "std",    label: "Std Dev (σ)", value: stats.std.toFixed(2),   color,            toggle: onToggleStd,    active: showStd },
    { key: "q1",     label: "Q1 (25th)",  value: stats.q1.toFixed(2),    color: "#94a3b8", toggle: () => {},       active: true },
    { key: "q3",     label: "Q3 (75th)",  value: stats.q3.toFixed(2),    color: "#94a3b8", toggle: () => {},       active: true },
    { key: "iqr",    label: "IQR",        value: (stats.q3 - stats.q1).toFixed(2), color: "#94a3b8", toggle: () => {}, active: true },
  ];

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Statistics</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {metrics.map(m => (
          <motion.button
            key={m.key}
            onClick={m.toggle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border p-2.5 text-left transition-colors"
            style={{
              borderColor: (m.active && ["mean","median","std"].includes(m.key)) ? `color-mix(in srgb, ${m.color} 38%, transparent)` : "#1e293b",
              background: (m.active && ["mean","median","std"].includes(m.key)) ? `color-mix(in srgb, ${m.color} 5%, transparent)` : "transparent",
              cursor: ["mean","median","std"].includes(m.key) ? "pointer" : "default",
            }}
          >
            <p className="text-[16px] font-black" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[9px] text-[#475569] mt-0.5">{m.label}</p>
            {["mean","median","std"].includes(m.key) && (
              <p className="text-[8px] text-[#334155] mt-0.5">{m.active ? "Shown ▲" : "Click to show"}</p>
            )}
          </motion.button>
        ))}
      </div>
      <p className="text-[9px] text-[#475569]">
        Click Mean, Median, or Std Dev cards to toggle overlay lines on the chart.
      </p>
    </div>
  );
}
