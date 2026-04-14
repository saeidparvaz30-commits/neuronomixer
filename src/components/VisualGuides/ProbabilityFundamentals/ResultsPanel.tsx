"use client";

import React from "react";
import { type SimState } from "./types";

interface ResultsPanelProps {
  sim: SimState;
  theoretical: number;
  totalTrials: number;
}

export default function ResultsPanel({ sim, theoretical, totalTrials }: ResultsPanelProps) {
  if (!sim.completed) return null;

  const diff = Math.abs(sim.experimental - theoretical);
  const pctDiff = (diff * 100).toFixed(2);

  let interpretation: string;
  if (diff < 0.005) {
    interpretation =
      "Excellent convergence — experimental probability is nearly identical to theory. The Law of Large Numbers holds.";
  } else if (diff < 0.02) {
    interpretation =
      "Very close to theory. Small random variation remains, as expected with finite trials.";
  } else if (diff < 0.05) {
    interpretation =
      "Reasonable agreement. Running more trials would push experimental probability closer to the theoretical value.";
  } else {
    interpretation =
      "Notable gap — this is within normal sampling variation. Try running 10,000 trials to see stronger convergence.";
  }

  return (
    <div className="rounded-2xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5 px-5 py-4 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#3bb4a4]">
        Simulation Complete — {totalTrials.toLocaleString()} Trials
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
            Theoretical P
          </p>
          <p className="text-2xl font-black text-[#d4af37] font-mono">
            {theoretical.toFixed(4)}
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">({(theoretical * 100).toFixed(2)}%)</p>
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
            Experimental P
          </p>
          <p className="text-2xl font-black text-[#3bb4a4] font-mono">
            {sim.experimental.toFixed(4)}
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">
            ({(sim.experimental * 100).toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
            Difference
          </p>
          <span
            className={`text-lg font-black font-mono ${
              diff < 0.005
                ? "text-[#3bb4a4]"
                : diff < 0.02
                ? "text-[#d4af37]"
                : "text-white"
            }`}
          >
            ±{diff.toFixed(4)} ({pctDiff} pp)
          </span>
        </div>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">{interpretation}</p>
      </div>

      <p className="text-[11px] text-[#475569] leading-relaxed">
        Matches: {sim.matchCount.toLocaleString()} / {totalTrials.toLocaleString()} trials
      </p>
    </div>
  );
}
