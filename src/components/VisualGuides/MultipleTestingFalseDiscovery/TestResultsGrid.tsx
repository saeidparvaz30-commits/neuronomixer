"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TestResult } from "./types";

interface TestResultsGridProps {
  testResults: TestResult[];
  bonferroniApplied: boolean;
  fdrApplied: boolean;
  holmApplied: boolean;
}

export default function TestResultsGrid({
  testResults,
  bonferroniApplied,
  fdrApplied,
  holmApplied,
}: TestResultsGridProps) {
  const showAdjusted = bonferroniApplied || fdrApplied || holmApplied;
  const totalSignificant = testResults.filter(r => r.significant).length;
  const totalAdjustedSignificant = showAdjusted
    ? testResults.filter(r => r.adjustedSignificant).length
    : null;
  const expectedFP = (testResults.length * 0.05).toFixed(1);

  if (testResults.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
          Test Results
        </p>
        <div className="text-center py-10 text-[#334155] text-[13px]">
          Run the simulation to see results here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Test Results
      </p>

      {/* Scrollable table */}
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto rounded-xl border border-[#1e293b]">
        <table className="w-full text-[11px] border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-[#1e293b] bg-[#1e293b]/60 sticky top-0 z-10">
              <th className="text-left px-3 py-2 text-[#94a3b8] font-semibold">#</th>
              <th className="text-left px-3 py-2 text-[#94a3b8] font-semibold">Flavor</th>
              <th className="text-right px-3 py-2 text-[#94a3b8] font-semibold">P-Value</th>
              <th className="text-center px-3 py-2 text-[#94a3b8] font-semibold">Significant?</th>
              {showAdjusted && (
                <>
                  <th className="text-right px-3 py-2 text-[#94a3b8] font-semibold">Adj. P-Value</th>
                  <th className="text-center px-3 py-2 text-[#94a3b8] font-semibold">Adj. Significant?</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {testResults.map((row, idx) => (
                <motion.tr
                  key={row.testName}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.02 }}
                  className={`border-b border-[#1e293b]/60 ${
                    row.significant
                      ? "bg-[#d4af37]/10"
                      : "hover:bg-[#1e293b]/30"
                  } transition-colors`}
                >
                  <td className="px-3 py-2 font-mono text-[#475569]">{row.testNumber}</td>
                  <td className="px-3 py-2 text-white">{row.testName}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    <span
                      className={
                        row.significant ? "text-[#d4af37] font-semibold" : "text-[#94a3b8]"
                      }
                    >
                      {row.pValue.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.significant ? (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#d4af37]/20 text-[#d4af37] font-semibold text-[10px]">
                        Yes
                      </span>
                    ) : (
                      <span className="text-[#475569]">No</span>
                    )}
                  </td>
                  {showAdjusted && (
                    <>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.adjustedPValue !== undefined ? (
                          <span
                            className={
                              row.adjustedSignificant ? "text-[#3bb4a4] font-semibold" : "text-[#94a3b8]"
                            }
                          >
                            {row.adjustedPValue.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-[#334155]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.adjustedPValue !== undefined ? (
                          row.adjustedSignificant ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#3bb4a4]/20 text-[#3bb4a4] font-semibold text-[10px]">
                              Yes
                            </span>
                          ) : (
                            <span className="text-[#475569]">No</span>
                          )
                        ) : (
                          <span className="text-[#334155]">—</span>
                        )}
                      </td>
                    </>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-3 rounded-xl border border-[#1e293b] p-3 text-[11px] text-[#94a3b8] space-y-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Total:{" "}
            <span className="text-white font-semibold">{testResults.length}</span>
          </span>
          <span>
            Significant (uncorrected):{" "}
            <span className={totalSignificant > 0 ? "text-[#d4af37] font-semibold" : "text-white font-semibold"}>
              {totalSignificant}
            </span>
          </span>
          <span>
            Expected under null: M×0.05 ={" "}
            <span className="text-[#475569] font-semibold">{expectedFP}</span>
          </span>
          {totalAdjustedSignificant !== null && (
            <span>
              Significant (adjusted):{" "}
              <span className="text-[#3bb4a4] font-semibold">{totalAdjustedSignificant}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
