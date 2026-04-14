"use client";

import React from "react";
import { motion } from "framer-motion";
import { TestResult, applyBonferroni, applyFDR, applyHolm } from "./types";

interface CorrectionComparisonProps {
  testResults: TestResult[];
  numberOfTests: number;
  bonferroniApplied: boolean;
  fdrApplied: boolean;
  holmApplied: boolean;
}

export default function CorrectionComparison({
  testResults,
  numberOfTests,
  bonferroniApplied,
  fdrApplied,
  holmApplied,
}: CorrectionComparisonProps) {
  if (testResults.length === 0) return null;
  if (!bonferroniApplied && !fdrApplied && !holmApplied) return null;

  const total = testResults.length;
  const uncorrectedCount = testResults.filter(r => r.significant).length;

  // Always recompute each correction independently for display
  const bonferroniResults = applyBonferroni(testResults, numberOfTests);
  const fdrResults = applyFDR(testResults, numberOfTests);
  const holmResults = applyHolm(testResults, numberOfTests);

  const bonferroniCount = bonferroniResults.filter(r => r.adjustedSignificant).length;
  const fdrCount = fdrResults.filter(r => r.adjustedSignificant).length;
  const holmCount = holmResults.filter(r => r.adjustedSignificant).length;

  function pctStr(n: number) {
    return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%";
  }

  function countColor(n: number, max: number): string {
    if (n === 0) return "text-[#3bb4a4]";
    const ratio = n / Math.max(max, 1);
    if (ratio > 0.6) return "text-[#ef4444]";
    if (ratio > 0.3) return "text-[#d4af37]";
    return "text-[#3bb4a4]";
  }

  const rows = [
    {
      method: "Uncorrected (α=0.05)",
      count: uncorrectedCount,
      pct: pctStr(uncorrectedCount),
      notes: "Baseline — inflated by chance",
      shown: true,
    },
    {
      method: "Bonferroni",
      count: bonferroniCount,
      pct: pctStr(bonferroniCount),
      notes: "Most conservative",
      shown: bonferroniApplied,
    },
    {
      method: "Benjamini-Hochberg FDR",
      count: fdrCount,
      pct: pctStr(fdrCount),
      notes: "Moderate (controls FDR)",
      shown: fdrApplied,
    },
    {
      method: "Holm",
      count: holmCount,
      pct: pctStr(holmCount),
      notes: "Stepdown (controls FWER)",
      shown: holmApplied,
    },
  ];

  const maxCount = uncorrectedCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Method Comparison
      </p>

      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full text-[11px] border-collapse min-w-[360px]">
          <thead>
            <tr className="border-b border-[#1e293b] bg-[#1e293b]/60">
              <th className="text-left px-3 py-2 text-[#94a3b8] font-semibold">Method</th>
              <th className="text-right px-3 py-2 text-[#94a3b8] font-semibold">Significant</th>
              <th className="text-right px-3 py-2 text-[#94a3b8] font-semibold">% of Total</th>
              <th className="text-left px-3 py-2 text-[#94a3b8] font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(r => r.shown).map((row, idx) => (
              <motion.tr
                key={row.method}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.07 }}
                className="border-b border-[#1e293b]/60 hover:bg-[#1e293b]/30 transition-colors"
              >
                <td className="px-3 py-2 text-white">{row.method}</td>
                <td className="px-3 py-2 text-right">
                  {row.count === 0 ? (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#3bb4a4]/15 text-[#3bb4a4] font-semibold">
                      0
                    </span>
                  ) : (
                    <span className={`font-semibold font-mono ${countColor(row.count, maxCount)}`}>
                      {row.count}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[#94a3b8]">{row.pct}</td>
                <td className="px-3 py-2 text-[#475569]">{row.notes}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-[#334155] mt-2">
        Under the null (no real effects), expected significant count ≈ {(total * 0.05).toFixed(1)} with α=0.05.
        Corrections reduce false discoveries toward zero.
      </p>
    </motion.div>
  );
}
