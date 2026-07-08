"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import type { MisleadingChart, MisleadingId } from "./types";
import HonestComparisonPanel from "./HonestComparisonPanel";

interface Props {
  chart: MisleadingChart;
  revealed: boolean;
  onReveal: () => void;
}

export default function MisleadingChartCard({ chart, revealed, onReveal }: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-white mb-1">{chart.title}</h3>
          <p className="text-[12px] text-[#94a3b8] italic">&ldquo;{chart.deceptiveCaption}&rdquo;</p>
        </div>
        {revealed && (
          <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#3bb4a4] bg-[#3bb4a4]/10 rounded-full px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Revealed
          </span>
        )}
      </div>

      {/* Lie explanation */}
      {!revealed ? (
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            This chart hides something important. Can you spot the deception before revealing?
          </p>
          <button
            onClick={onReveal}
            className="mt-3 px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Reveal the truth
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[#ef4444]/25 bg-[#ef4444]/5 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ef4444] mb-1">The lie</p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed">{chart.lie}</p>
        </div>
      )}

      {/* Side-by-side comparison */}
      <AnimatePresence>
        {revealed && (
          <>
            <HonestComparisonPanel id={chart.id as MisleadingId} />
            <div className="rounded-xl border border-[#3bb4a4]/20 bg-[#3bb4a4]/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#3bb4a4] mb-1">What honest looks like</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">{chart.honestCaption}</p>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
