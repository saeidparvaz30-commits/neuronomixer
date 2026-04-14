"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExperimentResult } from "./types";

interface TestResultsProps {
  result: ExperimentResult | null;
  tStat: number | null;
  pValue: number | null;
  alpha: number;
}

function getInterpretation(result: ExperimentResult, pValue: number, alpha: number, tStat: number): string {
  if (result === "reject") {
    return `The p-value (${pValue.toFixed(4)}) is below α (${alpha.toFixed(2)}), so we reject the null hypothesis. The observed difference is statistically significant at this significance level. This could be a true effect (power) or a false positive (Type I error) if H₀ is actually true.`;
  }
  return `The p-value (${pValue.toFixed(4)}) exceeds α (${alpha.toFixed(2)}), so we fail to reject the null hypothesis. This does not prove H₀ is true — it only means we don't have enough evidence to reject it. The |t-stat| of ${Math.abs(tStat).toFixed(3)} was not extreme enough.`;
}

export default function TestResults({ result, tStat, pValue, alpha }: TestResultsProps) {
  return (
    <AnimatePresence>
      {result !== null && tStat !== null && pValue !== null && (
        <motion.div
          key={`${result}-${pValue}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border bg-[#0f172a] p-5"
          style={{
            borderColor: result === "reject" ? "rgba(239,68,68,0.3)" : "rgba(148,163,184,0.2)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-2 h-8 rounded-full flex-shrink-0"
              style={{ background: result === "reject" ? "#ef4444" : "#475569" }}
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-0.5">
                Test Result
              </p>
              <p
                className="text-[22px] font-black tracking-tight leading-none"
                style={{ color: result === "reject" ? "#f87171" : "#94a3b8" }}
              >
                {result === "reject" ? "REJECTED" : "FAILED TO REJECT"}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-[#1e293b] p-2.5 text-center">
              <p className="text-[9px] text-[#475569] mb-1">t-statistic</p>
              <p className="text-[14px] font-bold font-mono text-white">{tStat.toFixed(4)}</p>
            </div>
            <div className="rounded-lg border border-[#1e293b] p-2.5 text-center">
              <p className="text-[9px] text-[#475569] mb-1">p-value</p>
              <p
                className="text-[14px] font-bold font-mono"
                style={{ color: pValue < alpha ? "#f87171" : "#94a3b8" }}
              >
                {pValue < 0.0001 ? "< 0.0001" : pValue.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg border border-[#1e293b] p-2.5 text-center">
              <p className="text-[9px] text-[#475569] mb-1">Significant at α={alpha.toFixed(2)}</p>
              <p
                className="text-[14px] font-bold"
                style={{ color: result === "reject" ? "#f87171" : "#94a3b8" }}
              >
                {result === "reject" ? "YES" : "NO"}
              </p>
            </div>
          </div>

          {/* Interpretation */}
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {getInterpretation(result, pValue, alpha, tStat)}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
