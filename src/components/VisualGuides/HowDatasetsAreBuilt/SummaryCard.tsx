"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { STAGE_CONFIGS } from "./types";

const SUMMARIES: Record<string, string> = {
  "raw-source":     "Identified data in its original, messy state",
  "collection":     "Gathered data from multiple disparate sources",
  "cleaning":       "Fixed errors, nulls, duplicates, and inconsistencies",
  "transformation": "Engineered new features and reshaped columns",
  "analysis-ready": "Verified quality and readiness for analysis",
};

export default function SummaryCard({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.65 }}
      className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-px bg-[var(--color-accent)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">Pipeline Complete</span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">You&apos;ve walked the full pipeline! 🎉</h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          All 5 stages completed — from raw, messy sources to a clean, analysis-ready dataset.
        </p>
      </div>

      {/* Stage recap */}
      <div className="px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-4">Pipeline Recap</p>

        {/* Desktop: horizontal dots */}
        <div className="hidden sm:flex items-start gap-0 mb-6 overflow-x-auto pb-2">
          {STAGE_CONFIGS.map((s, i) => (
            <div key={s.id} className="flex items-start">
              <div className="flex flex-col items-center min-w-[100px] max-w-[120px]">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px] border-2 border-white/10 mb-2"
                  style={{ background: s.color }}>
                  ✓
                </div>
                <p className="text-[11px] font-semibold text-white text-center">{s.title}</p>
                <p className="text-[10px] text-[#94a3b8] text-center mt-0.5 leading-snug">{SUMMARIES[s.id]}</p>
              </div>
              {i < STAGE_CONFIGS.length - 1 && (
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-white/10 mt-[18px] mx-2 min-w-[20px]" />
              )}
            </div>
          ))}
        </div>

        {/* Mobile: vertical list */}
        <div className="flex sm:hidden flex-col gap-3 mb-6">
          {STAGE_CONFIGS.map((s) => (
            <div key={s.id} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: s.color }}>✓</div>
              <div>
                <p className="text-[12px] font-semibold text-white">{s.title}</p>
                <p className="text-[11px] text-[#94a3b8]">{SUMMARIES[s.id]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Key takeaway */}
        <div className="rounded-xl border-l-4 border-[#d4af37] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
          <p className="text-[12px] font-semibold text-[#d4af37] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
            &quot;Real-world data is never clean. Every dataset you work with has been through a pipeline like this — or should be.
            The quality of your analysis is only as good as the quality of your data preparation.&quot;
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link href="/visual-guides"
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
          ← All Guides
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={onReset}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            Try Again
          </button>
          <Link href="/visual-guides/missing-data"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next Guide →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
