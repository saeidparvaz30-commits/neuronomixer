"use client";

import React from "react";
import { motion } from "framer-motion";
import { mean, stdDev, criticalValue } from "./types";

interface Props {
  groupA: number[];
  groupB: number[];
  tStatistic: number | null;
  pValue: number | null;
  alpha: number;
}

export default function MetricsPanel({ groupA, groupB, tStatistic, pValue, alpha }: Props) {
  if (groupA.length === 0 || tStatistic === null || pValue === null) return null;

  const mA = mean(groupA);
  const mB = mean(groupB);
  const diff = mB - mA;
  const n = groupA.length;
  const df = 2 * n - 2;

  // 95% CI for the difference: (meanB - meanA) ± t_crit * SE
  const sA = stdDev(groupA);
  const sB = stdDev(groupB);
  const pooledSD = Math.sqrt(((n - 1) * sA ** 2 + (n - 1) * sB ** 2) / df);
  const se = pooledSD * Math.sqrt(2 / n);
  // Exact two-sided t critical value for this df (not a hardcoded 1.96/2.0)
  const tCrit = criticalValue(0.05, df, "two-tailed");
  const ciLow = diff - tCrit * se;
  const ciHigh = diff + tCrit * se;

  const isSignificant = pValue < alpha;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
        Statistical Summary
      </p>

      <div className="space-y-2.5">
        {[
          { label: "Group A mean", value: mA.toFixed(3), color: "#3bb4a4" },
          { label: "Group B mean", value: mB.toFixed(3), color: "#1e5d8a" },
          { label: "Difference (B − A)", value: diff.toFixed(3), color: diff >= 0 ? "var(--color-accent)" : "#94a3b8" },
          { label: "Sample size (each group)", value: String(n) },
          { label: "Degrees of freedom", value: String(df) },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-[10px] text-[#475569]">{label}</span>
            <span className="text-[11px] font-mono font-semibold" style={{ color: color ?? "white" }}>
              {value}
            </span>
          </div>
        ))}

        <div className="border-t border-[#1e293b] pt-2.5 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#475569]">Observed t-statistic</span>
            <span className="text-[12px] font-mono font-black text-white">{tStatistic.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#475569]">p-value</span>
            <span
              className="text-[12px] font-mono font-black"
              style={{ color: isSignificant ? "#3bb4a4" : "#ef4444" }}
            >
              {pValue < 0.001 ? "<0.001" : pValue.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#475569]">Significant at α = {alpha}?</span>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-md"
              style={{
                color: isSignificant ? "#3bb4a4" : "#ef4444",
                background: isSignificant ? "#3bb4a415" : "#ef444415",
              }}
            >
              {isSignificant ? "YES" : "NO"}
            </span>
          </div>
        </div>

        <div className="border-t border-[#1e293b] pt-2.5">
          <p className="text-[10px] text-[#475569] mb-1">
            95% CI for difference (B − A)
          </p>
          <p className="text-[11px] font-mono text-white">
            [{ciLow.toFixed(3)}, {ciHigh.toFixed(3)}]
          </p>
          <p className="text-[9px] text-[#334155] mt-0.5">
            {ciLow > 0 || ciHigh < 0
              ? "CI excludes zero, consistent with a real difference."
              : "CI includes zero, so the effect may be due to chance."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
