"use client";

import React from "react";
import { type SimState } from "./types";

interface TrialCounterProps {
  sim: SimState;
  totalTrials: number;
  theoretical: number;
}

export default function TrialCounter({ sim, totalTrials, theoretical }: TrialCounterProps) {
  const diff = Math.abs(sim.experimental - theoretical);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-3 py-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
          Trial
        </p>
        <p className="text-lg font-black text-white font-mono">
          {sim.trialCount.toLocaleString()}
        </p>
        <p className="text-[10px] text-[#475569] mt-0.5">
          of {totalTrials.toLocaleString()}
        </p>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-3 py-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
          Current P
        </p>
        <p className="text-lg font-black text-[#3bb4a4] font-mono">
          {sim.trialCount === 0 ? "—" : sim.experimental.toFixed(3)}
        </p>
        <p className="text-[10px] text-[#475569] mt-0.5">experimental</p>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-3 py-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
          vs Theory
        </p>
        <p
          className={`text-lg font-black font-mono ${
            sim.trialCount === 0
              ? "text-[#475569]"
              : diff < 0.01
              ? "text-[#3bb4a4]"
              : diff < 0.05
              ? "text-[var(--color-accent)]"
              : "text-white"
          }`}
        >
          {sim.trialCount === 0 ? "—" : `±${diff.toFixed(3)}`}
        </p>
        <p className="text-[10px] text-[#475569] mt-0.5">difference</p>
      </div>
    </div>
  );
}
