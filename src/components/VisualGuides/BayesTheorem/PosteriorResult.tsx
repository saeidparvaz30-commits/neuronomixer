"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ScenarioType } from "./types";
import { SCENARIO_CONFIGS } from "./types";

interface PosteriorResultProps {
  posterior: number;
  baseRate: number;
  sensitivity: number;
  specificity: number;
  scenario: ScenarioType;
}

export default function PosteriorResult({
  posterior,
  baseRate,
  sensitivity,
  specificity,
  scenario,
}: PosteriorResultProps) {
  const sc = SCENARIO_CONFIGS[scenario];
  const pct = (posterior * 100).toFixed(2);

  // Color coding
  let posteriorColor = "#d4af37"; // yellow < 1%
  if (posterior > 0.05) posteriorColor = "#ef4444"; // red > 5%
  else if (posterior > 0.01) posteriorColor = "#f97316"; // orange 1-5%

  // Interpretation
  let interpretation: string;
  if (posterior > 0.5) {
    interpretation =
      "This test is quite informative — a positive result suggests a real risk.";
  } else if (posterior >= 0.1) {
    interpretation =
      "Important! Even though you tested positive, your actual risk is lower than the test accuracy suggests.";
  } else {
    interpretation =
      `Surprising! The condition is so rare that even a ${(sensitivity * 100).toFixed(0)}% accurate test produces mostly false positives. A follow-up test is strongly recommended.`;
  }

  // In 1,000,000 positives
  const N = 1_000_000;
  const withDisease = Math.round(N * baseRate);
  const withoutDisease = N - withDisease;
  const tp = Math.round(withDisease * sensitivity);
  const fp = Math.round(withoutDisease * (1 - specificity));
  const total = tp + fp;

  return (
    <div
      className="rounded-2xl border bg-[#0f172a] p-6 space-y-4"
      style={{ borderColor: posteriorColor + "50" }}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
          Posterior Result
        </p>
        <p className="text-[13px] text-[#94a3b8]">
          P({sc.conditionName} | {sc.testName})
        </p>
      </div>

      {/* Big posterior number */}
      <motion.div
        className="space-y-1"
        key={pct}
        initial={{ scale: 0.95, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-[11px] text-[#94a3b8]">
          Your risk if you test positive:
        </p>
        <p
          className="text-[52px] font-black leading-none"
          style={{ color: posteriorColor }}
        >
          {pct}%
        </p>
      </motion.div>

      {/* Interpretation */}
      <div
        className="rounded-xl border p-3"
        style={{ borderColor: posteriorColor + "30", background: posteriorColor + "08" }}
      >
        <p className="text-[12px] text-[#f1f5f9] leading-relaxed">{interpretation}</p>
      </div>

      {/* Formula breakdown */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a]/50 p-3 space-y-1">
        <p className="text-[10px] font-semibold text-[#d4af37] uppercase tracking-[1px] mb-2">
          Bayes Formula
        </p>
        <p className="text-[10px] text-[#475569] font-mono leading-relaxed">
          P(C|+) = P(+|C) × P(C)
        </p>
        <p className="text-[10px] text-[#475569] font-mono">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / [P(+|C)×P(C) + P(+|¬C)×P(¬C)]
        </p>
        <p className="text-[10px] text-[#94a3b8] font-mono mt-1">
          = {sensitivity.toFixed(3)} × {baseRate.toFixed(4)}
        </p>
        <p className="text-[10px] text-[#94a3b8] font-mono">
          &nbsp;&nbsp;/ [{sensitivity.toFixed(3)}×{baseRate.toFixed(4)} + {(1 - specificity).toFixed(3)}×
          {(1 - baseRate).toFixed(4)}]
        </p>
        <p className="text-[13px] font-black text-white font-mono mt-1">
          = {posterior.toFixed(6)} ({pct}%)
        </p>
      </div>

      {/* 1M breakdown + bar */}
      {total > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-[#475569]">
            In 1,000,000 people who test positive:
          </p>
          <div className="flex gap-2 flex-wrap text-[10px]">
            <span className="px-2 py-1 rounded-md bg-[#3bb4a4]/15 text-[#3bb4a4] font-semibold">
              ~{tp.toLocaleString()} actually have it
            </span>
            <span className="px-2 py-1 rounded-md bg-[#ef4444]/15 text-[#ef4444] font-semibold">
              ~{fp.toLocaleString()} false positives
            </span>
          </div>
          <div className="flex rounded-full overflow-hidden h-3 w-full border border-[#1e293b]">
            <motion.div
              className="h-full bg-[#3bb4a4]"
              animate={{ width: `${(tp / total) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="h-full bg-[#ef4444]"
              animate={{ width: `${(fp / total) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
