"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TestResult } from "./types";

interface MultipleComparisonCorrectionPanelProps {
  testResults: TestResult[];
  numberOfTests: number;
  bonferroniApplied: boolean;
  fdrApplied: boolean;
  holmApplied: boolean;
  onApplyBonferroni: () => void;
  onApplyFDR: () => void;
  onApplyHolm: () => void;
}

type TabKey = "bonferroni" | "fdr" | "holm";

const TABS: { key: TabKey; label: string }[] = [
  { key: "bonferroni", label: "Bonferroni" },
  { key: "fdr", label: "FDR (BH)" },
  { key: "holm", label: "Holm" },
];

export default function MultipleComparisonCorrectionPanel({
  testResults,
  numberOfTests,
  bonferroniApplied,
  fdrApplied,
  holmApplied,
  onApplyBonferroni,
  onApplyFDR,
  onApplyHolm,
}: MultipleComparisonCorrectionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("bonferroni");
  const M = numberOfTests;

  const tabInfo: Record<
    TabKey,
    {
      title: string;
      explanation: string;
      formula: string;
      caveat: string;
      applied: boolean;
      onApply: () => void;
    }
  > = {
    bonferroni: {
      title: "Bonferroni Correction",
      explanation:
        "Divide the significance threshold by the number of tests. Each test must now meet a much stricter standard to be called significant. Controls the family-wise error rate (FWER): the probability of making even one false positive.",
      formula: `α_adjusted = α / M = 0.05 / ${M} = ${(0.05 / M).toFixed(4)}`,
      caveat:
        "Most conservative: very low false positive rate, but high false negative rate. Can miss true effects when M is large.",
      applied: bonferroniApplied,
      onApply: onApplyBonferroni,
    },
    fdr: {
      title: "Benjamini-Hochberg FDR",
      explanation:
        "Sort p-values from smallest to largest. Reject null hypotheses for the largest k where p(k) ≤ (k/M)×α. Controls the False Discovery Rate: the expected proportion of false discoveries among all discoveries.",
      formula: `Reject H₀(k) if p(k) ≤ (k / M) × α = (k / ${M}) × 0.05`,
      caveat:
        "Moderate: allows a controlled proportion of false positives (~5%). Better power than Bonferroni when many tests are run.",
      applied: fdrApplied,
      onApply: onApplyFDR,
    },
    holm: {
      title: "Holm Stepdown Procedure",
      explanation:
        "Sort p-values from smallest to largest. Starting from the smallest, reject H₀ if p(k) ≤ α/(M−k+1). Stop as soon as one fails. Also controls FWER but is uniformly more powerful than Bonferroni.",
      formula: `Reject H₀(k) if p(k) ≤ α / (M − k + 1) = 0.05 / (${M} − k + 1)`,
      caveat:
        "Stepdown: more powerful than Bonferroni for the same FWER guarantee. Still conservative when M is large.",
      applied: holmApplied,
      onApply: onApplyHolm,
    },
  };

  const current = tabInfo[activeTab];

  // Comparison counts
  const uncorrected = testResults.filter(r => r.significant).length;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
        Multiple Comparison Corrections
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border border-[#1e293b] rounded-xl p-1" role="radiogroup" aria-label="Correction method">
        {TABS.map(tab => {
          const isApplied =
            tab.key === "bonferroni"
              ? bonferroniApplied
              : tab.key === "fdr"
              ? fdrApplied
              : holmApplied;
          return (
            <button
              key={tab.key}
              role="radio"
              aria-checked={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all relative ${
                activeTab === tab.key
                  ? "bg-[#1e293b] text-white"
                  : "text-[#475569] hover:text-[#94a3b8]"
              }`}
            >
              {tab.label}
              {isApplied && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#3bb4a4]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">{current.title}</p>
            {current.applied && (
              <span className="px-2 py-0.5 rounded-md bg-[#3bb4a4]/20 text-[#3bb4a4] text-[10px] font-semibold">
                Applied
              </span>
            )}
          </div>

          <p className="text-[12px] text-[#94a3b8] leading-relaxed">{current.explanation}</p>

          <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/40 p-3">
            <p className="text-[11px] font-mono text-[var(--color-accent)]">{current.formula}</p>
          </div>

          <div className="rounded-xl border border-[#475569]/30 bg-[#475569]/10 p-3">
            <p className="text-[10px] font-semibold text-[#94a3b8] mb-1 uppercase tracking-wider">
              Caveat
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">{current.caveat}</p>
          </div>

          {testResults.length > 0 ? (
            <motion.button
              onClick={current.onApply}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-2 rounded-xl text-[12px] font-semibold transition-all ${
                current.applied
                  ? "border border-[#3bb4a4] text-[#3bb4a4] hover:bg-[#3bb4a4]/10"
                  : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
              }`}
            >
              {current.applied ? "Re-apply Correction" : `Apply ${current.title}`}
            </motion.button>
          ) : (
            <p className="text-[11px] text-[#334155] text-center py-2">
              Run simulation first to apply corrections.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Quick comparison */}
      {testResults.length > 0 && (bonferroniApplied || fdrApplied || holmApplied) && (
        <div className="mt-4 rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] mb-2">
            Significant Count Comparison
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#94a3b8]">Uncorrected (α=0.05)</span>
              <span className={uncorrected > 0 ? "text-[var(--color-accent)] font-semibold" : "text-white font-semibold"}>
                {uncorrected}
              </span>
            </div>
            {bonferroniApplied && (
              <div className="flex justify-between text-[11px]">
                <span className="text-[#94a3b8]">Bonferroni</span>
                <span className="text-[#3bb4a4] font-semibold">
                  {testResults.filter(r => r.adjustedSignificant).length}
                </span>
              </div>
            )}
            {fdrApplied && (
              <div className="flex justify-between text-[11px]">
                <span className="text-[#94a3b8]">FDR (BH)</span>
                <span className="text-[#3bb4a4] font-semibold">
                  {testResults.filter(r => r.adjustedSignificant).length}
                </span>
              </div>
            )}
            {holmApplied && (
              <div className="flex justify-between text-[11px]">
                <span className="text-[#94a3b8]">Holm</span>
                <span className="text-[#3bb4a4] font-semibold">
                  {testResults.filter(r => r.adjustedSignificant).length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
