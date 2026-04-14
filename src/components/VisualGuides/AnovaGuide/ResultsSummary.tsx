"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnovaStatistics } from "./types";

interface ResultsSummaryProps {
  statistics: AnovaStatistics | null;
  isComplete: boolean;
}

function fmtP(p: number): string {
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}

function etaLabel(eta: number): string {
  if (eta >= 0.14) return "large";
  if (eta >= 0.06) return "medium";
  return "small";
}

function etaColor(eta: number): string {
  if (eta >= 0.14) return "#4ade80";
  if (eta >= 0.06) return "#d4af37";
  return "#94a3b8";
}

export default function ResultsSummary({ statistics, isComplete }: ResultsSummaryProps) {
  if (!statistics) {
    return (
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <h2 className="text-[13px] font-semibold text-white uppercase tracking-wider mb-3">
          Results Summary
        </h2>
        <p className="text-[12px] text-[#475569]">
          Run ANOVA to see a summary of results.
        </p>
      </div>
    );
  }

  const { fStatistic, pValue, dfBetween, dfWithin, etaSquared } = statistics;
  const significant = pValue < 0.05;

  return (
    <div
      className="rounded-2xl border bg-[#0f172a] p-5"
      style={{ borderColor: significant ? "#16a34a" : "#1e293b" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-white uppercase tracking-wider">
          Results Summary
        </h2>
        {isComplete && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#3bb4a4]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Guide complete
          </motion.span>
        )}
      </div>

      {/* Key finding */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ background: significant ? "#14532d" : "#1e293b", border: significant ? "1px solid #16a34a" : "1px solid transparent" }}
      >
        <p
          className="text-[14px] font-semibold leading-snug"
          aria-live="polite"
          style={{ color: significant ? "#4ade80" : "#f87171" }}
        >
          The four teaching methods{" "}
          <strong>{significant ? "do differ significantly" : "do not differ significantly"}</strong>{" "}
          <span className="font-mono text-[12px] font-normal text-white">
            (F({dfBetween}, {dfWithin}) = {fStatistic.toFixed(2)}, p = {fmtP(pValue)})
          </span>
        </p>
      </div>

      {/* Effect size */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl bg-[#1e293b] p-4">
          <div className="text-[10px] text-[#94a3b8] mb-1 uppercase tracking-wider">Effect Size (η²)</div>
          <div
            className="text-[28px] font-black font-mono"
            style={{ color: etaColor(etaSquared) }}
          >
            {etaSquared.toFixed(3)}
          </div>
          <div className="text-[11px] mt-1" style={{ color: etaColor(etaSquared) }}>
            {etaLabel(etaSquared)} effect
          </div>
          <div className="mt-2 text-[10px] text-[#475569] space-y-0.5">
            <div>0.01 = small</div>
            <div>0.06 = medium</div>
            <div>0.14 = large</div>
          </div>
        </div>

        <div className="rounded-xl bg-[#1e293b] p-4">
          <div className="text-[10px] text-[#94a3b8] mb-1 uppercase tracking-wider">Interpretation</div>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            η² = {etaSquared.toFixed(3)} means{" "}
            <strong className="text-white">{(etaSquared * 100).toFixed(1)}%</strong> of the total
            variance in scores is explained by which teaching method was used.
          </p>
          <p className="text-[11px] text-[#475569] mt-2">
            F({dfBetween}, {dfWithin}) = {fStatistic.toFixed(2)}
            <br />
            p-value = {fmtP(pValue)}
          </p>
        </div>
      </div>

      {/* Mark complete info button */}
      <div className="flex items-center justify-between pt-4 border-t border-[#1e293b]">
        <p className="text-[11px] text-[#475569]">
          {isComplete
            ? "All criteria met — guide marked complete."
            : "Complete all 5 progress steps to finish this guide."}
        </p>
        {isComplete && (
          <span className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[#1e293b] text-[#3bb4a4] border border-[#16a34a]">
            Completed
          </span>
        )}
      </div>
    </div>
  );
}
