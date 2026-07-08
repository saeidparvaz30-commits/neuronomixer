"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TestResult } from "./types";

interface Props {
  parametricResult: TestResult | null;
  nonparametricResult: TestResult | null;
  isNormal: boolean;
  onViewed: () => void;
}

function NormalCurveIcon() {
  return (
    <svg width={32} height={20} viewBox="0 0 32 20" className="opacity-70">
      <path
        d="M2 18 Q8 18 10 10 Q14 2 16 2 Q18 2 22 10 Q24 18 30 18"
        fill="none"
        stroke="#1e5d8a"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function RankIcon() {
  return (
    <svg width={32} height={20} viewBox="0 0 32 20" className="opacity-70">
      {[4, 10, 16, 22, 28].map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy={10} r={4} fill="none" stroke="#3bb4a4" strokeWidth={1.2} />
          <text x={cx} y={13.5} textAnchor="middle" fontSize={6} fill="#3bb4a4" fontWeight="700">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

const COMPARISON_ROWS = [
  { aspect: "Test Used", param: "Independent t-test", nonparam: "Mann-Whitney U" },
  { aspect: "Based on", param: "Means & variances", nonparam: "Ranks of values" },
  { aspect: "Assumption", param: "Normality required", nonparam: "No normality needed" },
  { aspect: "Sensitive to", param: "Outliers, skewness", nonparam: "Robust to outliers" },
  { aspect: "Use when", param: "Data is normally distributed", nonparam: "Normality is violated or data is ordinal" },
];

export default function ComparisonPanel({
  parametricResult,
  nonparametricResult,
  isNormal,
  onViewed,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);

  const handleExpand = () => {
    if (!expanded) {
      if (!hasViewed) {
        setHasViewed(true);
        onViewed();
      }
    }
    setExpanded((v) => !v);
  };

  const fmtP = (p: number | undefined) => {
    if (p === undefined) return "—";
    if (p < 0.001) return "< 0.001";
    return p.toFixed(3);
  };
  const fmtStat = (v: number | undefined, label: string) => {
    if (v === undefined) return "—";
    return `${label} = ${v.toFixed(2)}`;
  };

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <h3 className="text-[13px] font-bold text-white mb-1">Parametric vs. Nonparametric</h3>
      <p className="text-[11px] text-[#94a3b8] mb-4">
        Compare the t-test and Mann-Whitney U results side by side.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Parametric */}
        <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <NormalCurveIcon />
            <div>
              <p className="text-[12px] font-bold text-white">Parametric</p>
              <p className="text-[10px] text-[#94a3b8]">Independent t-test</p>
            </div>
          </div>

          {parametricResult ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#94a3b8]">Statistic</span>
                <span className="text-[11px] font-mono text-white font-semibold">
                  {fmtStat(parametricResult.statistic, parametricResult.statisticLabel)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#94a3b8]">p-value</span>
                <span className="text-[11px] font-mono text-white font-semibold">
                  {fmtP(parametricResult.pValue)}
                </span>
              </div>
              {parametricResult.ciLower !== undefined && parametricResult.ciUpper !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#94a3b8]">95% CI</span>
                  <span className="text-[10px] font-mono text-[#94a3b8]">
                    [{parametricResult.ciLower.toFixed(1)}, {parametricResult.ciUpper.toFixed(1)}]
                  </span>
                </div>
              )}
              <div className="pt-1">
                {!isNormal ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#ec4899]/20 text-[#ec4899] border border-[#ec4899]/30">
                    Normality violated; result may be unreliable
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30">
                    Assumptions met
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-[#475569]">Run assumption check to compute results.</p>
          )}
        </div>

        {/* Nonparametric */}
        <div className="rounded-xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <RankIcon />
            <div>
              <p className="text-[12px] font-bold text-white">Nonparametric</p>
              <p className="text-[10px] text-[#94a3b8]">Mann-Whitney U</p>
            </div>
          </div>

          {nonparametricResult ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#94a3b8]">Statistic</span>
                <span className="text-[11px] font-mono text-white font-semibold">
                  {fmtStat(nonparametricResult.statistic, nonparametricResult.statisticLabel)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#94a3b8]">p-value</span>
                <span className="text-[11px] font-mono text-white font-semibold">
                  {fmtP(nonparametricResult.pValue)}
                </span>
              </div>
              <div className="pt-1">
                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30">
                  No normality assumption needed (still assumes independent observations)
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-[#475569]">Run assumption check to compute results.</p>
          )}
        </div>
      </div>

      {/* Results comparison table */}
      {parametricResult && nonparametricResult && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#1e293b]">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left px-3 py-2 text-[#94a3b8] font-medium">Aspect</th>
                <th className="text-center px-3 py-2 text-[#94a3b8] font-medium">Parametric</th>
                <th className="text-center px-3 py-2 text-[#94a3b8] font-medium">Nonparametric</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#1e293b]/50">
                <td className="px-3 py-2 text-[#94a3b8]">Test Used</td>
                <td className="px-3 py-2 text-center text-white">t-test</td>
                <td className="px-3 py-2 text-center text-white">Mann-Whitney U</td>
              </tr>
              <tr className="border-b border-[#1e293b]/50">
                <td className="px-3 py-2 text-[#94a3b8]">Statistic</td>
                <td className="px-3 py-2 text-center font-mono text-white">
                  t = {parametricResult.statistic.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-center font-mono text-white">
                  U = {nonparametricResult.statistic.toFixed(0)}
                </td>
              </tr>
              <tr className="border-b border-[#1e293b]/50">
                <td className="px-3 py-2 text-[#94a3b8]">p-value</td>
                <td className="px-3 py-2 text-center font-mono text-white">
                  {fmtP(parametricResult.pValue)}
                </td>
                <td className="px-3 py-2 text-center font-mono text-white">
                  {fmtP(nonparametricResult.pValue)}
                </td>
              </tr>
              <tr className="border-b border-[#1e293b]/50">
                <td className="px-3 py-2 text-[#94a3b8]">Assumption Met?</td>
                <td className="px-3 py-2 text-center">
                  {isNormal ? (
                    <span className="text-[var(--color-success)] font-semibold">YES</span>
                  ) : (
                    <span className="text-[#ec4899] font-semibold">NO</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-[#94a3b8]">N/A</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-[#94a3b8]">Reliable?</td>
                <td className="px-3 py-2 text-center">
                  {isNormal ? (
                    <span className="text-[var(--color-success)] font-semibold">YES</span>
                  ) : (
                    <span className="text-[#ec4899] font-semibold">QUESTIONABLE</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[var(--color-success)] font-semibold">YES</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Key differences expandable */}
      <div className="mt-4">
        <button
          onClick={handleExpand}
          className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] hover:text-white transition-colors"
        >
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            ▶
          </motion.span>
          Key differences
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#1e293b]">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-[#1e293b]">
                      <th className="text-left px-3 py-2 text-[#94a3b8] font-medium">Aspect</th>
                      <th className="text-center px-3 py-2 text-[#94a3b8] font-medium">Parametric</th>
                      <th className="text-center px-3 py-2 text-[#94a3b8] font-medium">Nonparametric</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={i} className="border-b border-[#1e293b]/50 last:border-0">
                        <td className="px-3 py-2 text-[#94a3b8]">{row.aspect}</td>
                        <td className="px-3 py-2 text-center text-white">{row.param}</td>
                        <td className="px-3 py-2 text-center text-[#3bb4a4]">{row.nonparam}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
