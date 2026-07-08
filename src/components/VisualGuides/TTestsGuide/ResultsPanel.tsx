"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TTestResult } from "./types";

interface Props {
  result: TTestResult | null;
  nullValue?: number;
  group1Name?: string;
  group2Name?: string;
}

export default function ResultsPanel({
  result,
  nullValue = 0,
  group1Name = "Group 1",
  group2Name = "Group 2",
}: Props) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key="results"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">Test Results</p>
            <span
              className={`px-3 py-1 rounded-lg text-[12px] font-bold border ${
                result.significant
                  ? "border-[#3bb4a4]/40 bg-[#3bb4a4]/10 text-[#3bb4a4]"
                  : "border-white/10 bg-white/5 text-[#94a3b8]"
              }`}
            >
              {result.significant ? "Reject H\u2080" : "Fail to Reject H\u2080"}
            </span>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "t-statistic", value: result.tStatistic.toFixed(3), color: "var(--color-accent)" },
              { label: "p-value", value: result.pValue < 0.001 ? "< 0.001" : result.pValue.toFixed(4), color: result.significant ? "#3bb4a4" : "#ef4444" },
              { label: "Degrees of Freedom", value: result.df.toFixed(1), color: "#94a3b8" },
              { label: "Cohen\u2019s d", value: result.cohensD.toFixed(3), color: "#1e5d8a" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-[#1e293b] p-3 text-center">
                <p className="text-[9px] text-[#475569] mb-1">{label}</p>
                <p className="text-[20px] font-black font-mono" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Effect size badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[#475569]">Effect size:</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                result.effectSizeLabel === "large"
                  ? "bg-[#3bb4a4]/15 text-[#3bb4a4]"
                  : result.effectSizeLabel === "medium"
                  ? "bg-[#d4af37]/15 text-[var(--color-accent)]"
                  : "bg-white/5 text-[#94a3b8]"
              }`}
            >
              {result.effectSizeLabel.charAt(0).toUpperCase() + result.effectSizeLabel.slice(1)} (|d| = {Math.abs(result.cohensD).toFixed(2)})
            </span>
          </div>

          {/* 95% CI visualization */}
          <div>
            <p className="text-[10px] text-[#475569] mb-2 font-semibold">95% Confidence Interval for Difference</p>
            <CINumberLine
              ciLower={result.ciLower}
              ciUpper={result.ciUpper}
              nullValue={nullValue}
            />
          </div>

          {/* Interpretation */}
          <div className="rounded-xl border border-[#1e293b] p-3 bg-[#1e293b]/30">
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              <strong className="text-white">Interpretation: </strong>
              {result.significant
                ? `The data provide sufficient evidence (p = ${result.pValue < 0.001 ? "< 0.001" : result.pValue.toFixed(4)}) to reject the null hypothesis at the 5% significance level. The ${result.effectSizeLabel} effect (Cohen\u2019s d = ${result.cohensD.toFixed(2)}) suggests a ${result.effectSizeLabel === "negligible" ? "trivially small" : result.effectSizeLabel === "small" ? "modest" : result.effectSizeLabel === "medium" ? "moderate" : "substantial"} practical difference between ${group1Name} and ${group2Name}.`
                : `The data do not provide sufficient evidence (p = ${result.pValue.toFixed(4)}) to reject the null hypothesis at the 5% significance level. We cannot conclude there is a statistically significant difference between ${group1Name} and ${group2Name}. The 95% CI ${result.ciLower < nullValue && result.ciUpper > nullValue ? "contains" : "does not contain"} the null value.`}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── CI Number Line ─────────────────────────────────────────────────────────────

function CINumberLine({
  ciLower,
  ciUpper,
  nullValue,
}: {
  ciLower: number;
  ciUpper: number;
  nullValue: number;
}) {
  const W = 300, H = 40;
  const PAD = 24;
  const IW = W - 2 * PAD;

  // Determine range with buffer
  const span = Math.max(Math.abs(ciUpper - ciLower) * 1.5, Math.abs(nullValue - ciLower) * 1.5, Math.abs(nullValue - ciUpper) * 1.5, 0.1);
  const mid = (ciLower + ciUpper) / 2;
  const domMin = mid - span;
  const domMax = mid + span;

  const tx = (v: number) => PAD + ((v - domMin) / (domMax - domMin)) * IW;
  const nullX = tx(nullValue);
  const ciLX = tx(ciLower);
  const ciUX = tx(ciUpper);
  const midX = tx((ciLower + ciUpper) / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
      {/* Base line */}
      <line x1={PAD} y1={H / 2} x2={PAD + IW} y2={H / 2} stroke="#334155" strokeWidth="1.5" />
      {/* CI bar */}
      <rect x={ciLX} y={H / 2 - 4} width={ciUX - ciLX} height={8} fill="var(--color-accent)" opacity="0.7" rx="2" />
      {/* Endpoint ticks */}
      <line x1={ciLX} y1={H / 2 - 6} x2={ciLX} y2={H / 2 + 6} stroke="var(--color-accent)" strokeWidth="1.5" />
      <line x1={ciUX} y1={H / 2 - 6} x2={ciUX} y2={H / 2 + 6} stroke="var(--color-accent)" strokeWidth="1.5" />
      {/* Center dot */}
      <circle cx={midX} cy={H / 2} r="3" fill="var(--color-accent)" />
      {/* Null value line */}
      <line x1={nullX} y1={4} x2={nullX} y2={H - 4} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,2" />
      {/* Labels */}
      <text x={ciLX} y={H - 2} textAnchor="middle" fill="var(--color-accent)" fontSize="7">{ciLower.toFixed(2)}</text>
      <text x={ciUX} y={H - 2} textAnchor="middle" fill="var(--color-accent)" fontSize="7">{ciUpper.toFixed(2)}</text>
      <text x={nullX} y={8} textAnchor="middle" fill="#ef4444" fontSize="7">H₀={nullValue}</text>
    </svg>
  );
}
