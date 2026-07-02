"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  ContingencyTable,
  ScenarioKey,
  SCENARIOS,
  SCENARIO_LABELS,
  computeExpected,
  computeChiSquare,
  computeAssociationMeasures,
  rowTotals,
  colTotals,
  grandTotal,
} from "./types";

// ── Small helpers ─────────────────────────────────────────────────────────────

function cloneTable(t: ContingencyTable): ContingencyTable {
  return {
    rowLabels: [...t.rowLabels],
    colLabels: [...t.colLabels],
    data: t.data.map(row => [...row]),
  };
}

function fmt(n: number, digits = 3): string {
  return n.toFixed(digits);
}

function fmtP(p: number): string {
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}

// ── Sub-components ────────────────────────────────────────────────────────────

// -- Section heading
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-bold uppercase tracking-[2px] text-[#94a3b8] mb-4">
      {children}
    </h2>
  );
}

// -- Card wrapper
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

// -- Scenario selector buttons
function ScenarioSelector({
  active,
  onSelect,
}: {
  active: ScenarioKey;
  onSelect: (k: ScenarioKey) => void;
}) {
  const keys = Object.keys(SCENARIO_LABELS) as ScenarioKey[];
  return (
    <div className="flex flex-wrap gap-2">
      <GuideCompletion isComplete={allComplete} guideSlug="chi-square-independence" score={7} />
      {keys.map(k => (
        <button
          key={k}
          onClick={() => onSelect(k)}
          className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-colors ${
            active === k
              ? "bg-[#d4af37] text-[#0a0e1a]"
              : "border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
          }`}
        >
          {SCENARIO_LABELS[k]}
        </button>
      ))}
    </div>
  );
}

// -- Contingency table builder
function TableBuilder({
  table,
  onChange,
  onReset,
}: {
  table: ContingencyTable;
  onChange: (next: ContingencyTable) => void;
  onReset: () => void;
}) {
  const rt = rowTotals(table.data);
  const ct = colTotals(table.data);
  const gt = grandTotal(table.data);

  function setCell(i: number, j: number, val: number) {
    const next = cloneTable(table);
    next.data[i][j] = Math.max(0, val);
    onChange(next);
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[12px] w-full min-w-[360px]">
        <thead>
          <tr>
            <th className="p-2 bg-[#1e293b] text-[#94a3b8] font-semibold text-left rounded-tl-xl" />
            {table.colLabels.map(label => (
              <th
                key={label}
                className="p-2 bg-[#1e293b] text-white font-semibold text-center"
              >
                {label}
              </th>
            ))}
            <th className="p-2 bg-[#1e293b] text-[#475569] font-semibold text-center rounded-tr-xl">
              Row Total
            </th>
          </tr>
        </thead>
        <tbody>
          {table.data.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}
            >
              <td className="p-2 font-semibold text-[#94a3b8] whitespace-nowrap">
                {table.rowLabels[i]}
              </td>
              {row.map((val, j) => (
                <td key={j} className="p-1 text-center">
                  <input
                    type="number"
                    min="0"
                    value={val}
                    onChange={e => setCell(i, j, parseInt(e.target.value) || 0)}
                    className={`w-16 text-center bg-[#1e293b] text-white rounded-lg border px-2 py-1 text-[12px] focus:outline-none focus:border-[#d4af37] transition-colors ${
                      val < 0
                        ? "border-red-500"
                        : "border-[#334155] hover:border-[#475569]"
                    }`}
                  />
                </td>
              ))}
              <td className="p-2 text-center text-[#3bb4a4] font-semibold">
                {rt[i]}
              </td>
            </tr>
          ))}
          <tr className="bg-[#1e293b]">
            <td className="p-2 text-[#475569] font-semibold">Col Total</td>
            {ct.map((total, j) => (
              <td key={j} className="p-2 text-center text-[#3bb4a4] font-semibold">
                {total}
              </td>
            ))}
            <td className="p-2 text-center text-[#d4af37] font-bold">
              {gt}
            </td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={onReset}
        className="mt-3 px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
      >
        Reset to Scenario
      </button>
    </div>
  );
}

// -- Expected frequencies panel
function ExpectedFrequenciesPanel({
  table,
  expected,
}: {
  table: ContingencyTable;
  expected: number[][];
}) {
  const rt = rowTotals(table.data);
  const ct = colTotals(table.data);
  const gt = grandTotal(table.data);
  const allMet = expected.every(row => row.every(e => e >= 5));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            allMet
              ? "bg-[#3bb4a4]/10 text-[#3bb4a4] border border-[#3bb4a4]/30"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
          }`}
        >
          {allMet ? "All assumptions met" : "Warning: low expected frequencies"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Observed */}
        <div>
          <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
            Observed
          </p>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[11px] w-full">
              <thead>
                <tr>
                  <th className="p-1.5 bg-[#1e293b] text-[#475569] text-left" />
                  {table.colLabels.map(c => (
                    <th key={c} className="p-1.5 bg-[#1e293b] text-white text-center">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.data.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}>
                    <td className="p-1.5 text-[#94a3b8] font-semibold whitespace-nowrap">
                      {table.rowLabels[i]}
                    </td>
                    {row.map((val, j) => (
                      <td key={j} className="p-1.5 text-center text-white font-mono">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expected */}
        <div>
          <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
            Expected  E = (row × col) / n
          </p>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[11px] w-full">
              <thead>
                <tr>
                  <th className="p-1.5 bg-[#1e293b] text-[#475569] text-left" />
                  {table.colLabels.map(c => (
                    <th key={c} className="p-1.5 bg-[#1e293b] text-white text-center">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expected.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}>
                    <td className="p-1.5 text-[#94a3b8] font-semibold whitespace-nowrap">
                      {table.rowLabels[i]}
                    </td>
                    {row.map((e, j) => (
                      <td
                        key={j}
                        className={`p-1.5 text-center font-mono ${
                          e < 5 ? "text-amber-400" : "text-[#3bb4a4]"
                        }`}
                      >
                        {fmt(e, 1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Formula row callout */}
      {gt > 0 && (
        <div className="mt-3 rounded-xl bg-[#1e293b]/60 p-3 text-[11px] font-mono text-[#93c5fd]">
          Example: E₁₁ = ({rt[0]} × {ct[0]}) / {gt} = {fmt((rt[0] * ct[0]) / gt, 2)}
        </div>
      )}
    </div>
  );
}

// -- Chi-square decomposition table + bar chart
function DecompositionPanel({
  table,
  expected,
  contributions,
  chiSq,
}: {
  table: ContingencyTable;
  expected: number[][];
  contributions: number[][];
  chiSq: number;
}) {
  // flatten contributions for bar chart
  type ContribEntry = { label: string; value: number };
  const entries: ContribEntry[] = [];
  for (let i = 0; i < table.data.length; i++) {
    for (let j = 0; j < (table.data[0]?.length ?? 0); j++) {
      entries.push({
        label: `${table.rowLabels[i]} / ${table.colLabels[j]}`,
        value: contributions[i]?.[j] ?? 0,
      });
    }
  }

  const maxVal = Math.max(...entries.map(e => e.value), 0.01);
  const SVG_W = 380;
  const BAR_H = 18;
  const BAR_GAP = 6;
  const LABEL_W = 130;
  const svgH = entries.length * (BAR_H + BAR_GAP) + 10;

  function cellColor(contrib: number): string {
    if (contrib < 1) return "#3bb4a4";
    if (contrib < 5) return "#f59e0b";
    return "#ef4444";
  }

  function contribColor(contrib: number): string {
    if (contrib < 1) return "text-[#3bb4a4]";
    if (contrib < 5) return "text-amber-400";
    return "text-red-400";
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto mb-5">
        <table className="border-collapse text-[11px] w-full min-w-[520px]">
          <thead>
            <tr className="bg-[#1e293b]">
              <th className="p-2 text-[#475569] text-left font-semibold">Cell</th>
              <th className="p-2 text-white text-center font-semibold">O</th>
              <th className="p-2 text-white text-center font-semibold">E</th>
              <th className="p-2 text-white text-center font-semibold">(O−E)²</th>
              <th className="p-2 text-white text-center font-semibold">(O−E)²/E</th>
            </tr>
          </thead>
          <tbody>
            {table.data.map((row, i) =>
              row.map((obs, j) => {
                const e = expected[i]?.[j] ?? 0;
                const contrib = contributions[i]?.[j] ?? 0;
                return (
                  <tr
                    key={`${i}-${j}`}
                    className={(i * row.length + j) % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}
                  >
                    <td className="p-2 text-[#94a3b8] whitespace-nowrap">
                      {table.rowLabels[i]} / {table.colLabels[j]}
                    </td>
                    <td className="p-2 text-center text-white font-mono">{obs}</td>
                    <td className="p-2 text-center font-mono text-[#3bb4a4]">
                      {fmt(e, 2)}
                    </td>
                    <td className="p-2 text-center font-mono text-[#94a3b8]">
                      {fmt((obs - e) ** 2, 2)}
                    </td>
                    <td className={`p-2 text-center font-mono font-semibold ${contribColor(contrib)}`}>
                      {fmt(contrib, 4)}
                    </td>
                  </tr>
                );
              })
            )}
            <tr className="bg-[#1e293b]">
              <td colSpan={4} className="p-2 text-right text-[#94a3b8] font-semibold">
                χ² =
              </td>
              <td className="p-2 text-center text-[#d4af37] font-bold font-mono text-[13px]">
                {fmt(chiSq, 4)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SVG bar chart */}
      <p className="text-[11px] text-[#475569] mb-2 font-semibold uppercase tracking-wide">
        Contribution per Cell
      </p>
      <div className="overflow-x-auto">
        <svg
          width={SVG_W}
          height={svgH}
          aria-label="Chi-square contributions bar chart"
          className="overflow-visible"
        >
          {entries.map((entry, idx) => {
            const barW = ((entry.value / maxVal) * (SVG_W - LABEL_W - 60)) || 0;
            const y = idx * (BAR_H + BAR_GAP);
            const color = cellColor(entry.value);
            return (
              <g key={idx} transform={`translate(0, ${y})`}>
                <text
                  x={0}
                  y={BAR_H / 2 + 4}
                  fill="#94a3b8"
                  fontSize={10}
                  fontFamily="monospace"
                  clipPath={`url(#clip-${idx})`}
                >
                  {entry.label}
                </text>
                <clipPath id={`clip-${idx}`}>
                  <rect x={0} y={0} width={LABEL_W - 4} height={BAR_H + 2} />
                </clipPath>
                <rect
                  x={LABEL_W}
                  y={0}
                  width={Math.max(barW, 2)}
                  height={BAR_H}
                  rx={4}
                  fill={color}
                  opacity={0.85}
                />
                <text
                  x={LABEL_W + Math.max(barW, 2) + 5}
                  y={BAR_H / 2 + 4}
                  fill={color}
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {fmt(entry.value, 2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 flex-wrap">
        {[
          { color: "#3bb4a4", label: "< 1 (low)" },
          { color: "#f59e0b", label: "1–5 (moderate)" },
          { color: "#ef4444", label: "> 5 (high)" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: item.color }}
            />
            <span className="text-[10px] text-[#475569]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Test result card
function TestResultCard({
  chiSq,
  df,
  pValue,
  rows,
  cols,
}: {
  chiSq: number;
  df: number;
  pValue: number;
  rows: number;
  cols: number;
}) {
  const reject = pValue < 0.05;
  return (
    <div className="space-y-4">
      {/* Big stats */}
      <div className="flex flex-wrap gap-6 items-end">
        <div>
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Chi-Square Statistic
          </p>
          <p className="text-4xl font-black text-[#d4af37] font-mono">
            {fmt(chiSq, 3)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Degrees of Freedom
          </p>
          <p className="text-2xl font-bold text-white font-mono">
            {df}
            <span className="text-[12px] text-[#475569] ml-1.5 font-normal">
              ({rows}-1)×({cols}-1)
            </span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            p-value
          </p>
          <p className="text-2xl font-bold font-mono" style={{ color: reject ? "#4ade80" : "#94a3b8" }}>
            {fmtP(pValue)}
          </p>
        </div>
      </div>

      {/* Verdict badge */}
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold border ${
          reject
            ? "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30"
            : "bg-[#1e293b] text-[#94a3b8] border-[#334155]"
        }`}
      >
        {reject ? (
          <>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Reject H₀: Variables are NOT independent (p &lt; 0.05)
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Fail to reject H₀ — insufficient evidence of dependence (p ≥ 0.05)
          </>
        )}
      </div>

      {/* Null hypothesis */}
      <div className="rounded-xl bg-[#1e293b]/60 p-3 text-[11px] font-mono text-[#93c5fd]">
        H₀: The two variables are independent (no association)
        <br />
        H₁: The two variables are NOT independent (association exists)
      </div>
    </div>
  );
}

// -- Association measures cards
function AssociationPanel({
  chiSq,
  n,
  rows,
  cols,
  table,
}: {
  chiSq: number;
  n: number;
  rows: number;
  cols: number;
  table: number[][];
}) {
  const measures = computeAssociationMeasures(chiSq, n, rows, cols, table);
  const is2x2 = rows === 2 && cols === 2;

  const effectColors = {
    weak: "text-[#94a3b8]",
    moderate: "text-amber-400",
    strong: "text-[#4ade80]",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Cramér's V */}
      <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] mb-1">
          Cramér&apos;s V
        </p>
        <p className="text-2xl font-bold font-mono text-white">
          {fmt(measures.cramersV, 3)}
        </p>
        <p className={`text-[11px] font-semibold mt-1 ${effectColors[measures.effectSizeLabel]}`}>
          {measures.effectSizeLabel.charAt(0).toUpperCase() + measures.effectSizeLabel.slice(1)} association
        </p>
        <p className="text-[10px] text-[#475569] mt-1">
          √(χ² / (n × min(r-1, c-1)))
        </p>
      </div>

      {/* Phi — 2×2 only */}
      {is2x2 && measures.phi !== undefined && (
        <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] mb-1">
            Phi (φ)
          </p>
          <p className="text-2xl font-bold font-mono text-white">
            {fmt(measures.phi, 3)}
          </p>
          <p className="text-[10px] text-[#475569] mt-2">
            √(χ² / n) — equivalent to Pearson&apos;s r for 2×2 tables
          </p>
        </div>
      )}

      {/* Odds ratio — 2×2 only */}
      {is2x2 && measures.oddsRatio !== undefined && (
        <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] mb-1">
            Odds Ratio
          </p>
          <p className="text-2xl font-bold font-mono text-white">
            {fmt(measures.oddsRatio, 3)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            (a × d) / (b × c)
          </p>
          <p className="text-[10px] text-[#94a3b8] mt-1">
            {measures.oddsRatio > 1
              ? "Row 1 has higher odds of the first outcome"
              : measures.oddsRatio < 1
              ? "Row 2 has higher odds of the first outcome"
              : "Equal odds across groups"}
          </p>
        </div>
      )}

      {/* Risk ratio — 2×2 only */}
      {is2x2 && measures.riskRatio !== undefined && (
        <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] mb-1">
            Risk Ratio (RR)
          </p>
          <p className="text-2xl font-bold font-mono text-white">
            {fmt(measures.riskRatio, 3)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            (a / row1Total) / (c / row2Total)
          </p>
          <p className="text-[10px] text-[#94a3b8] mt-1">
            {measures.riskRatio > 1
              ? "Row 1 has higher relative risk"
              : measures.riskRatio < 1
              ? "Row 2 has higher relative risk"
              : "Equal risk across groups"}
          </p>
        </div>
      )}

      {/* Cramér's V scale reference */}
      <div className="sm:col-span-2 rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] mb-2">
          Effect Size Reference (Cramér&apos;s V)
        </p>
        <div className="flex gap-4 flex-wrap">
          {[
            { range: "0 – 0.10", label: "Weak", color: "#475569" },
            { range: "0.10 – 0.30", label: "Moderate", color: "#f59e0b" },
            { range: "0.30+", label: "Strong", color: "#4ade80" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <span className="text-[10px]" style={{ color: item.color }}>
                {item.label}
              </span>
              <span className="text-[10px] text-[#475569]">({item.range})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Completion card
function CompletionCard({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.65 }}
      className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
    >
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-px bg-[#d4af37]" />
          <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[#d4af37]">
            Guide Complete
          </span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          Chi-Square Mastered
        </h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          You explored multiple scenarios, computed expected frequencies, and interpreted association measures.
        </p>
      </div>

      <div className="px-6 py-5 space-y-3">
        <ul className="text-[12px] text-[#94a3b8] space-y-1.5 list-none">
          {[
            "Loaded and compared 2+ contingency table scenarios",
            "Computed expected frequencies using E = (row × col) / n",
            "Decomposed χ² into per-cell contributions",
            "Interpreted the p-value and test decision",
            "Explored Cramér's V and 2×2 specific measures",
          ].map(item => (
            <li key={item} className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        <div className="rounded-xl border-l-4 border-[#d4af37] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4">
          <p className="text-[12px] font-semibold text-[#d4af37] mb-1.5 uppercase tracking-wide">
            Key Takeaway
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
            &quot;The chi-square test tells you whether an association exists, but Cramér&apos;s V tells
            you how strong it is — statistical significance and practical significance are not the same thing.&quot;
          </p>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link
          href="/visual-guides"
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          ← All Guides
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/visual-guides/regression-to-mean"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Regression to the Mean →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export default function ChiSquareGuideClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const assocRef = useRef<HTMLDivElement>(null);

  // Active scenario key
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("treatment-outcome");
  // Current table data (editable copy)
  const [table, setTable] = useState<ContingencyTable>(() =>
    cloneTable(SCENARIOS["treatment-outcome"])
  );
  // Completion tracking
  const [scenariosLoaded, setScenariosLoaded] = useState<Set<ScenarioKey>>(
    () => new Set<ScenarioKey>(["treatment-outcome"])
  );
  const [expectedViewed, setExpectedViewed] = useState(false);
  const [chiSqViewed, setChiSqViewed] = useState(false);
  const [testResultSeen, setTestResultSeen] = useState(false);
  const [associationViewed, setAssociationViewed] = useState(false);

  // Derived math — recalculate on every table change (no debounce; small tables)
  const expected = computeExpected(table);
  const gt = grandTotal(table.data);
  const { chiSq, df, pValue, contributions, lowExpectedWarning } = computeChiSquare(
    table.data,
    expected
  );

  const rows = table.data.length;
  const cols = table.data[0]?.length ?? 0;

  // Load scenario
  const loadScenario = useCallback((key: ScenarioKey) => {
    setActiveScenario(key);
    setTable(cloneTable(SCENARIOS[key]));
    setScenariosLoaded(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  // Reset current scenario
  const resetTable = useCallback(() => {
    setTable(cloneTable(SCENARIOS[activeScenario]));
  }, [activeScenario]);

  // Intersection observer: mark test result seen
  useEffect(() => {
    if (testResultSeen || !resultRef.current) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setTestResultSeen(true);
      },
      { threshold: 0.4 }
    );
    obs.observe(resultRef.current);
    return () => obs.disconnect();
  }, [testResultSeen]);

  // Intersection observer: mark association viewed
  useEffect(() => {
    if (associationViewed || !assocRef.current) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setAssociationViewed(true);
      },
      { threshold: 0.4 }
    );
    obs.observe(assocRef.current);
    return () => obs.disconnect();
  }, [associationViewed]);

  // Mark expected viewed when section renders (user scrolled to see it)
  const expectedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (expectedViewed || !expectedRef.current) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setExpectedViewed(true);
      },
      { threshold: 0.4 }
    );
    obs.observe(expectedRef.current);
    return () => obs.disconnect();
  }, [expectedViewed]);

  // Mark chiSqViewed similarly
  const chiSqRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chiSqViewed || !chiSqRef.current) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setChiSqViewed(true);
      },
      { threshold: 0.4 }
    );
    obs.observe(chiSqRef.current);
    return () => obs.disconnect();
  }, [chiSqViewed]);

  // Completion condition
  const allComplete =
    scenariosLoaded.size >= 2 &&
    expectedViewed &&
    chiSqViewed &&
    testResultSeen &&
    associationViewed;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "chi-square-independence", score: 7 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // Reset handler
  function handleReset() {
    completionFired.current = false;
    loadScenario("treatment-outcome");
    setScenariosLoaded(new Set<ScenarioKey>(["treatment-outcome"]));
    setExpectedViewed(false);
    setChiSqViewed(false);
    setTestResultSeen(false);
    setAssociationViewed(false);
  }

  // Progress steps
  const progressSteps = [
    { label: `Scenarios: ${scenariosLoaded.size}/2`, done: scenariosLoaded.size >= 2 },
    { label: "Expected frequencies viewed", done: expectedViewed },
    { label: "Chi-square interpreted", done: testResultSeen },
    { label: "Association measure explored", done: associationViewed },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              STATISTICS
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] text-[#475569] uppercase tracking-[1.5px]">
              UNIT 9: ASSOCIATION &amp; DEPENDENCE
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Chi-Square{" "}
            <span className="text-[#d4af37]">Test of Independence</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Discover whether two categorical variables are associated. Build contingency
            tables, compute expected frequencies, decompose the χ² statistic cell by
            cell, and quantify association strength.
          </p>
        </motion.section>

        {/* Progress dots */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progressSteps.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                {label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Section 1: Scenario Selector + Table Builder */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-5"
        >
          <Card>
            <SectionHeading>Step 1 — Select a Scenario &amp; Edit the Table</SectionHeading>

            <ScenarioSelector active={activeScenario} onSelect={loadScenario} />

            <div className="mt-4">
              <TableBuilder
                table={table}
                onChange={setTable}
                onReset={resetTable}
              />
            </div>

            {/* Scenario hint */}
            <div className="mt-3 rounded-xl bg-[#1e293b]/60 p-3 text-[11px] text-[#94a3b8]">
              <span className="font-semibold text-white">H₀:</span> The two variables are independent.
              Edit cells to see how the test statistic changes live.
            </div>
          </Card>
        </motion.div>

        {/* Section 2: Expected Frequencies */}
        <motion.div
          ref={expectedRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-5"
        >
          <Card>
            <SectionHeading>Step 2 — Expected Frequencies</SectionHeading>
            {lowExpectedWarning && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
                </svg>
                One or more expected frequencies &lt; 5. Chi-square approximation may be unreliable.
                Consider combining categories or using Fisher&apos;s exact test.
              </div>
            )}
            <ExpectedFrequenciesPanel table={table} expected={expected} />
          </Card>
        </motion.div>

        {/* Section 3: Chi-Square Decomposition */}
        <motion.div
          ref={chiSqRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-5"
        >
          <Card>
            <SectionHeading>Step 3 — Chi-Square Decomposition</SectionHeading>
            <DecompositionPanel
              table={table}
              expected={expected}
              contributions={contributions}
              chiSq={chiSq}
            />
          </Card>
        </motion.div>

        {/* Section 4: Test Result */}
        <motion.div
          ref={resultRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-5"
        >
          <Card>
            <SectionHeading>Step 4 — Test Result</SectionHeading>
            <TestResultCard
              chiSq={chiSq}
              df={df}
              pValue={pValue}
              rows={rows}
              cols={cols}
            />
          </Card>
        </motion.div>

        {/* Section 5: Association Measures */}
        <motion.div
          ref={assocRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mb-5"
        >
          <Card>
            <SectionHeading>Step 5 — Association Measures</SectionHeading>
            <p className="text-[12px] text-[#475569] mb-4">
              Effect size quantifies practical significance beyond the p-value.
              {rows === 2 && cols === 2
                ? " Phi, Odds Ratio, and Risk Ratio are available for 2×2 tables."
                : ` Cramér's V is used for ${rows}×${cols} tables.`}
            </p>
            <AssociationPanel
              chiSq={chiSq}
              n={gt}
              rows={rows}
              cols={cols}
              table={table.data}
            />
          </Card>
        </motion.div>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && <CompletionCard onReset={handleReset} />}
        </AnimatePresence>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/correlation-covariance"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Correlation &amp; Covariance
          </Link>
          <Link
            href="/visual-guides/regression-to-mean"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Regression to the Mean →
          </Link>
        </div>
      </div>
    </div>
  );
}
