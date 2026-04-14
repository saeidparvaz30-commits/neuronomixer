"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AssumptionItem {
  key: string;
  label: string;
  description: string;
  howToCheck: string;
  violationFix: string;
  exampleViolation: string;
}

const ASSUMPTIONS: AssumptionItem[] = [
  {
    key: "normality",
    label: "Normality",
    description:
      "Each group's data should be approximately normally distributed (especially relevant for small samples).",
    howToCheck:
      "Inspect a histogram or Q-Q plot of residuals. Use Shapiro-Wilk test (significant result = non-normal). For large n, the Central Limit Theorem provides some robustness.",
    violationFix:
      "Use a non-parametric alternative such as the Mann-Whitney U test, which does not assume normality.",
    exampleViolation:
      "Reaction-time data is often right-skewed. A t-test on raw reaction times may be unreliable; log-transforming the data or using Wilcoxon rank-sum is preferred.",
  },
  {
    key: "equalVariance",
    label: "Equal Variance (Homogeneity)",
    description:
      "The standard t-test assumes both groups have the same population variance (σ₁² = σ₂²).",
    howToCheck:
      "Run Levene's test or Brown-Forsythe test for equality of variances. A significant result suggests unequal variances.",
    violationFix:
      "Use Welch's t-test (unequal variance t-test), which adjusts the degrees of freedom and does not require equal variances.",
    exampleViolation:
      "Comparing income between two occupations: one group may have a wide spread (e.g., CEO vs. average worker). Standard t-test would inflate Type I error.",
  },
  {
    key: "independence",
    label: "Independence of Observations",
    description:
      "Each data point should be independent of the others. Observations from the same subject, school, or time period may be correlated.",
    howToCheck:
      "Review the study design. Look for repeated measures, clustering (e.g., students within classrooms), or time-series structure.",
    violationFix:
      "Use a mixed-effects model (random effects for subject/cluster) or a paired t-test if the pairing is by design.",
    exampleViolation:
      "A drug trial measuring each patient at three time points: treating all measurements as independent inflates the effective sample size and produces false precision.",
  },
  {
    key: "noConfounding",
    label: "No Confounding",
    description:
      "A confound is a variable that is associated with both the predictor and the outcome, creating a spurious association.",
    howToCheck:
      "Draw a Directed Acyclic Graph (DAG) of the causal structure. Identify backdoor paths between treatment and outcome. Consider all plausible common causes.",
    violationFix:
      "Randomize treatment assignment (RCT) to eliminate confounding. In observational studies, use stratification, matching, or regression adjustment.",
    exampleViolation:
      "Countries with more hospitals have more disease deaths — but hospitals are built where disease is prevalent. Hospital count confounds the naive analysis.",
  },
];

interface AssumptionChecklistPanelProps {
  checkedSet: Set<string>;
  onCheck: (key: string, checked: boolean) => void;
}

export default function AssumptionChecklistPanel({
  checkedSet,
  onCheck,
}: AssumptionChecklistPanelProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Assumption Checklist
        </p>
        <span className="text-[11px] text-[#94a3b8]">
          <span className={checkedSet.size === 4 ? "text-[#3bb4a4] font-semibold" : "text-white font-semibold"}>
            {checkedSet.size}
          </span>
          <span className="text-[#475569]">/4 checked</span>
        </span>
      </div>

      <div className="space-y-2">
        {ASSUMPTIONS.map(item => {
          const isChecked = checkedSet.has(item.key);
          const isExpanded = expandedKey === item.key;

          return (
            <div
              key={item.key}
              className={`rounded-xl border transition-colors ${
                isChecked ? "border-[#3bb4a4]/40 bg-[#3bb4a4]/5" : "border-[#1e293b]"
              }`}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  id={`assumption-${item.key}`}
                  checked={isChecked}
                  onChange={e => onCheck(item.key, e.target.checked)}
                  className="w-4 h-4 accent-[#3bb4a4] cursor-pointer flex-shrink-0"
                />
                <label
                  htmlFor={`assumption-${item.key}`}
                  className={`flex-1 text-[12px] font-semibold cursor-pointer ${
                    isChecked ? "text-[#3bb4a4]" : "text-white"
                  }`}
                >
                  {item.label}
                </label>
                <button
                  onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                  className="text-[#475569] hover:text-[#94a3b8] transition-colors text-[11px] flex-shrink-0"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  <svg
                    viewBox="0 0 12 12"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Collapsible detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2 border-t border-[#1e293b] pt-2">
                      <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                        {item.description}
                      </p>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] mb-0.5">
                          How to Check
                        </p>
                        <p className="text-[11px] text-[#94a3b8] leading-relaxed">{item.howToCheck}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] mb-0.5">
                          Violation Fix
                        </p>
                        <p className="text-[11px] text-[#3bb4a4] leading-relaxed">{item.violationFix}</p>
                      </div>

                      <div className="rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/5 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#d4af37] mb-0.5">
                          Example Violation
                        </p>
                        <p className="text-[11px] text-[#94a3b8] leading-relaxed italic">
                          {item.exampleViolation}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 rounded-xl border border-[#1e293b] p-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-bold transition-colors ${
              checkedSet.size === 4
                ? "bg-[#3bb4a4]/20 text-[#3bb4a4]"
                : "bg-[#1e293b] text-[#475569]"
            }`}
          >
            {checkedSet.size}
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            {checkedSet.size === 4
              ? "All assumptions reviewed — great statistical diligence!"
              : `${4 - checkedSet.size} assumption${4 - checkedSet.size === 1 ? "" : "s"} remaining. Expand each to learn more.`}
          </p>
        </div>
      </div>
    </div>
  );
}
