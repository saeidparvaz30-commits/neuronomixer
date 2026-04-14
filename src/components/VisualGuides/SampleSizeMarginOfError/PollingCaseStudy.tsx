"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onViewed: () => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const STEPS = [
  {
    num: 1,
    title: "Define Goals",
    content: (
      <p className="text-[12px] text-[#94a3b8] leading-relaxed">
        Target MOE = ±3 percentage points at 95% confidence, estimating voter
        support (p ≈ 50%).
      </p>
    ),
  },
  {
    num: 2,
    title: "Apply the Formula",
    content: (
      <div className="space-y-2">
        <div className="rounded-xl bg-[#1e293b]/50 border border-[#3bb4a4]/20 p-3">
          <p className="text-[12px] font-mono text-[#3bb4a4] leading-relaxed">
            n = (1.96)² × 0.5 × 0.5 / (0.03)²
          </p>
          <p className="text-[12px] font-mono text-[#3bb4a4] mt-1">
            n = 3.8416 × 0.25 / 0.0009
          </p>
          <p className="text-[14px] font-mono font-bold text-[#d4af37] mt-1">
            n = <strong>1,067</strong>
          </p>
        </div>
      </div>
    ),
  },
  {
    num: 3,
    title: "Practical Adjustments",
    content: (
      <ul className="space-y-2">
        {[
          {
            label: "Non-response buffer (20%)",
            detail: "1,067 / 0.80 ≈ 1,334 contacts needed",
            color: "#d4af37",
          },
          {
            label: "State-level oversampling",
            detail:
              "Oversample key battleground states for state-level estimates",
            color: "#3bb4a4",
          },
          {
            label: "Post-field weighting",
            detail:
              "Weight by census demographics (age, sex, education, region)",
            color: "#1e5d8a",
          },
        ].map(({ label, detail, color }) => (
          <li key={label} className="flex items-start gap-3">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: color }}
            />
            <div>
              <p className="text-[12px] font-semibold text-white">{label}</p>
              <p className="text-[11px] text-[#94a3b8]">{detail}</p>
            </div>
          </li>
        ))}
      </ul>
    ),
  },
  {
    num: 4,
    title: "Published Result",
    content: (
      <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4">
        <p className="text-[15px] font-bold text-[#d4af37] text-center mb-1">
          48% support
        </p>
        <p className="text-[12px] text-[#94a3b8] text-center">
          (95% CI: 45% to 51%)
        </p>
        <p className="text-[11px] text-[#475569] text-center mt-2">
          Cannot rule out either candidate leading — within the margin
        </p>
      </div>
    ),
  },
  {
    num: 5,
    title: "Historical Note",
    content: (
      <div className="rounded-xl border border-[#f97316]/20 bg-[#f97316]/5 p-3">
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          Polls are accurate in stable elections. The 2016 and 2020 U.S.
          presidential elections had systematic misses caused by
          education-correlated non-response bias — college-educated voters
          were over-represented in samples, skewing estimates toward one
          candidate.
        </p>
      </div>
    ),
  },
];

export default function PollingCaseStudy({ onViewed }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) onViewed();
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#d4af37]">
              Case Study
            </span>
          </div>
          <p className="text-[15px] font-bold text-white">
            Presidential Election Polling
          </p>
          <p className="text-[12px] text-[#94a3b8] mt-0.5">
            How major polling organizations plan and execute election surveys
          </p>
        </div>
        <span className="text-[#475569] flex-shrink-0 ml-4">
          <ChevronIcon open={isOpen} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 border-t border-white/[0.04]">
              <div className="space-y-5 mt-5">
                {STEPS.map(({ num, title, content }) => (
                  <div key={num} className="flex gap-4">
                    {/* Step number */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-[#d4af37]">
                        {num}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white mb-2">
                        {title}
                      </p>
                      {content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
