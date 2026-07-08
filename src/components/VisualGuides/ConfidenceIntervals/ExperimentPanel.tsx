"use client";

import React from "react";
import { ConfidenceLevel, TRUE_MEAN, SAMPLE_N } from "./types";

interface Props {
  onGenerate: () => void;
  confidenceLevel: ConfidenceLevel;
  hasIntervals: boolean;
}

export default function ExperimentPanel({
  onGenerate,
  confidenceLevel,
  hasIntervals,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Generate button */}
        <button
          onClick={onGenerate}
          className="px-6 py-2.5 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity flex-shrink-0"
        >
          Generate 100 Samples
        </button>

        {/* Info */}
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-0.5">
              True Population Mean
            </p>
            <p className="text-[14px] font-black text-white">
              μ = {TRUE_MEAN}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-0.5">
              Sample Size
            </p>
            <p className="text-[14px] font-black text-[#3bb4a4]">
              n = {SAMPLE_N}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-0.5">
              Confidence Level
            </p>
            <p className="text-[14px] font-black text-[var(--color-accent)]">
              {confidenceLevel}%
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#475569] mt-3">
        Each bar shows a{" "}
        <span className="text-white font-semibold">{confidenceLevel}%</span>{" "}
        confidence interval from one sample of{" "}
        <span className="text-white font-semibold">n = {SAMPLE_N}</span>.{" "}
        {hasIntervals
          ? "Click any interval bar to see the full sample breakdown."
          : "Click Generate to run 100 experiments."}
      </p>
    </div>
  );
}
