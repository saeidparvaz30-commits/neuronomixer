"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScenarioConfig } from "./types";

interface ConditionalProbabilityCalculatorProps {
  scenario: ScenarioConfig;
  selectedNodeId: string | null;
}

export default function ConditionalProbabilityCalculator({
  scenario,
  selectedNodeId,
}: ConditionalProbabilityCalculatorProps) {
  const { keyResult } = scenario;
  const isActive = selectedNodeId !== null;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
        Conditional Probability
      </p>

      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div
            key="formula"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            {/* Formula block */}
            <div className="font-mono text-[13px] leading-relaxed space-y-1 mb-4">
              <div className="text-[#94a3b8]">P(A|B) = P(A and B) / P(B)</div>
              <div className="flex items-center gap-2">
                <span className="text-[#3bb4a4] font-semibold">{keyResult.formula}</span>
              </div>
              <div className="mt-2 space-y-0.5">
                <div className="flex items-start gap-3">
                  <span className="text-[var(--color-accent)] min-w-[80px]">numerator:</span>
                  <span className="text-white">{keyResult.numerator}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[var(--color-accent)] min-w-[80px]">denominator:</span>
                  <span className="text-white">{keyResult.denominator}</span>
                </div>
                <div className="flex items-start gap-3 pt-1 border-t border-[#1e293b]">
                  <span className="text-[#3bb4a4] font-bold min-w-[80px]">result:</span>
                  <span className="text-white font-bold">{keyResult.result}</span>
                </div>
              </div>
            </div>

            {/* Result badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#3bb4a4]/8 border border-[#3bb4a4]/20">
              <div className="w-8 h-8 rounded-full bg-[#3bb4a4]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#3bb4a4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-[12px] text-[#94a3b8] leading-snug">
                {keyResult.interpretation}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-6 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-[#475569]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
              </svg>
            </div>
            <p className="text-[12px] text-[#475569]">
              Click a tree node to see the conditional probability calculation for this scenario.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
