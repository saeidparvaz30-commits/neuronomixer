"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PairwiseComparison } from "./types";

interface PostHocComparisonProps {
  comparisons: PairwiseComparison[];
  onViewed: () => void;
}

type ViewMode = "matrix" | "network";

const GROUP_LABELS = ["Method A", "Method B", "Method C", "Method D"];
const NODE_POSITIONS = [
  { x: 80, y: 50 },
  { x: 220, y: 50 },
  { x: 80, y: 150 },
  { x: 220, y: 150 },
];
const GROUP_COLORS = ["#1e5d8a", "#3bb4a4", "#ec4899", "var(--color-warning)"];

function fmt(n: number, dec = 2): string {
  return n.toFixed(dec);
}

function fmtP(p: number): string {
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}

function findComparison(
  comparisons: PairwiseComparison[],
  g1: string,
  g2: string
): PairwiseComparison | undefined {
  return comparisons.find(
    c =>
      (c.group1 === g1 && c.group2 === g2) ||
      (c.group1 === g2 && c.group2 === g1)
  );
}

export default function PostHocComparison({ comparisons, onViewed }: PostHocComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [hasViewed, setHasViewed] = useState(false);

  function handleViewToggle(mode: ViewMode) {
    setViewMode(mode);
    if (!hasViewed) {
      setHasViewed(true);
      onViewed();
    }
  }

  function toggleRow(key: string) {
    setExpandedRow(prev => (prev === key ? null : key));
    if (!hasViewed) {
      setHasViewed(true);
      onViewed();
    }
  }

  const significantPairs = comparisons.filter(c => c.significant);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[13px] font-semibold text-white uppercase tracking-wider">
          Post-Hoc Comparisons
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
          background: significantPairs.length > 0 ? "#14532d" : "#1e293b",
          color: significantPairs.length > 0 ? "var(--color-success)" : "#94a3b8",
        }}>
          {significantPairs.length} significant pair{significantPairs.length !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-[11px] text-[#475569] mb-4">
        Bonferroni-corrected pairwise t-tests · family α = 0.05 · CIs are
        Bonferroni-adjusted (simultaneous 95%)
      </p>

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-[#1e293b] rounded-xl w-fit" role="radiogroup" aria-label="Comparison view">
        {(["matrix", "network"] as ViewMode[]).map(mode => (
          <button
            key={mode}
            role="radio"
            aria-checked={viewMode === mode}
            onClick={() => handleViewToggle(mode)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors capitalize"
            style={{
              background: viewMode === mode ? "var(--color-accent)" : "transparent",
              color: viewMode === mode ? "#0a0e1a" : "#94a3b8",
            }}
          >
            {mode === "matrix" ? "Matrix view" : "Network view"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "matrix" && (
          <motion.div
            key="matrix"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" aria-label="Pairwise comparison matrix">
                <thead>
                  <tr>
                    <th className="py-2 pr-2 text-left text-[#94a3b8] font-medium w-20" />
                    {GROUP_LABELS.map((label, i) => (
                      <th key={label} className="py-2 px-1 text-center font-medium" style={{ color: GROUP_COLORS[i] }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GROUP_LABELS.map((row, ri) => (
                    <React.Fragment key={row}>
                      <tr
                        className="border-t border-[#1e293b] cursor-pointer hover:bg-[#1e293b]/30 transition-colors"
                        onClick={() => toggleRow(row)}
                      >
                        <td className="py-2 pr-2 font-medium" style={{ color: GROUP_COLORS[ri] }}>
                          {row}
                        </td>
                        {GROUP_LABELS.map((col, ci) => {
                          if (ri === ci) {
                            return (
                              <td key={col} className="py-2 px-1 text-center text-[#334155]">—</td>
                            );
                          }
                          const comp = findComparison(comparisons, row, col);
                          if (!comp) return <td key={col} className="py-2 px-1 text-center text-[#334155]">—</td>;
                          return (
                            <td key={col} className="py-2 px-1 text-center">
                              <div
                                className="rounded-lg px-1.5 py-1 inline-block min-w-[56px]"
                                style={{
                                  background: comp.significant ? "#14532d" : "#1e293b",
                                  border: comp.significant ? "1px solid var(--color-success)" : "1px solid #334155",
                                }}
                              >
                                <div className="font-mono text-white text-[10px]">
                                  {comp.meanDiff > 0 ? "+" : ""}{fmt(comp.meanDiff, 1)}
                                </div>
                                <div style={{ color: comp.significant ? "var(--color-success)" : "#94a3b8" }} className="text-[9px]">
                                  p={fmtP(comp.pValueAdjusted)}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      <AnimatePresence>
                        {expandedRow === row && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={5} className="pb-3 pt-1 px-2">
                              <div className="bg-[#1e293b] rounded-xl p-3 text-[11px] text-[#94a3b8]">
                                <span className="text-white font-semibold">{row}</span> comparisons:
                                <div className="mt-2 space-y-1.5">
                                  {GROUP_LABELS.filter((_, ci) => ci !== ri).map(col => {
                                    const comp = findComparison(comparisons, row, col);
                                    if (!comp) return null;
                                    return (
                                      <div key={col} className="flex items-center gap-2">
                                        <span className="text-[#475569]">vs {col}:</span>
                                        <span className="font-mono text-white">
                                          Δ = {comp.meanDiff > 0 ? "+" : ""}{fmt(comp.meanDiff, 2)},
                                          adj. 95% CI [{fmt(comp.ciLower, 2)}, {fmt(comp.ciUpper, 2)}],
                                          p = {fmtP(comp.pValueAdjusted)}
                                        </span>
                                        {comp.significant ? (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#14532d] text-[var(--color-success)]">SIG</span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#334155] text-[#94a3b8]">n.s.</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border border-[var(--color-success)] bg-[#14532d]" />
                <span className="text-[10px] text-[#94a3b8]">Significant (p &lt; 0.05)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border border-[#334155] bg-[#1e293b]" />
                <span className="text-[10px] text-[#94a3b8]">Not significant</span>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === "network" && (
          <motion.div
            key="network"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex justify-center">
              <svg viewBox="0 0 300 200" className="w-full max-w-[300px] h-auto" aria-label="Network diagram of pairwise comparisons">
                {/* Edges */}
                {comparisons.map(comp => {
                  const i = GROUP_LABELS.indexOf(comp.group1);
                  const j = GROUP_LABELS.indexOf(comp.group2);
                  if (i === -1 || j === -1) return null;
                  const p1 = NODE_POSITIONS[i];
                  const p2 = NODE_POSITIONS[j];
                  return (
                    <line
                      key={`${comp.group1}-${comp.group2}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={comp.significant ? "var(--color-success)" : "#334155"}
                      strokeWidth={comp.significant ? 2.5 : 1}
                      strokeDasharray={comp.significant ? "none" : "3,3"}
                      opacity={comp.significant ? 0.9 : 0.4}
                    />
                  );
                })}
                {/* Nodes */}
                {GROUP_LABELS.map((label, i) => {
                  const pos = NODE_POSITIONS[i];
                  return (
                    <g key={label}>
                      <circle cx={pos.x} cy={pos.y} r={22} fill={GROUP_COLORS[i]} fillOpacity={0.2} stroke={GROUP_COLORS[i]} strokeWidth={2} />
                      <text x={pos.x} y={pos.y - 4} textAnchor="middle" fill={GROUP_COLORS[i]} fontSize={9} fontWeight="700">
                        {label}
                      </text>
                      <text x={pos.x} y={pos.y + 8} textAnchor="middle" fill="#94a3b8" fontSize={8} fontFamily="monospace">
                        —
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-[var(--color-success)]" />
                <span className="text-[10px] text-[#94a3b8]">Significant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-[#334155] border-dashed" style={{ borderTop: "1px dashed #334155" }} />
                <span className="text-[10px] text-[#94a3b8]">Not significant</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
