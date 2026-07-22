"use client";

import React, { useState } from "react";
import type { SetOpType } from "./types";

interface VennDiagramBuilderProps {
  onAdjust: () => void;
}

// Fixed dataset: |A|=50, |B|=40, |A∩B|=20, neither=30, universe=100
const U = 100;
const A_ONLY = 30;
const B_ONLY = 20;
const INTER = 20;
const NEITHER = 30;

const SVG_W = 360;
const SVG_H = 200;
const CX_A = 130;
const CX_B = 230;
const CY = 100;
const R = 75;
const GOLD = "var(--color-accent)";
const FO = 0.35; // fill opacity for highlighted regions

type OpConfig = {
  id: SetOpType;
  label: string;
  symbol: string;
  formula: string;
  formulaValue: string;
  highlighted: number;
  explanation: string;
};

const OPS: OpConfig[] = [
  {
    id: "union",
    label: "Union",
    symbol: "A∪B",
    formula: "P(A∪B) = P(A) + P(B) − P(A∩B)",
    formulaValue: "= 50/100 + 40/100 − 20/100 = 70/100",
    highlighted: A_ONLY + INTER + B_ONLY,
    explanation:
      "A∪B means \"A or B\": everything in A, in B, or in both. To avoid double-counting the overlap, we subtract P(A∩B).",
  },
  {
    id: "intersection",
    label: "Intersection",
    symbol: "A∩B",
    formula: "P(A∩B) = P(A) × P(B)  [if independent]",
    formulaValue: "|A∩B| = 20  →  P(A∩B) = 20/100",
    highlighted: INTER,
    explanation:
      "A∩B means \"A and B\": only elements in both sets simultaneously. If A and B are independent, P(A∩B) = P(A) × P(B).",
  },
  {
    id: "complement",
    label: "Complement",
    symbol: "Aᶜ",
    formula: "P(Aᶜ) = 1 − P(A)",
    formulaValue: "= 1 − 50/100 = 50/100",
    highlighted: B_ONLY + NEITHER,
    explanation:
      "Aᶜ means \"not A\": everything in the universe that is NOT in A. This includes the B-only region and the neither region.",
  },
  {
    id: "difference",
    label: "Difference",
    symbol: "A∖B",
    formula: "P(A∖B) = P(A) − P(A∩B)",
    formulaValue: "= 50/100 − 20/100 = 30/100",
    highlighted: A_ONLY,
    explanation:
      "A∖B means \"A but not B\": elements in A that are not in B. Also written A − B. Useful for isolating events exclusive to one set.",
  },
  {
    id: "symmetric_difference",
    label: "Sym. Diff.",
    symbol: "A△B",
    formula: "P(A△B) = P(A) + P(B) − 2·P(A∩B)",
    formulaValue: "= 50/100 + 40/100 − 2×20/100 = 50/100",
    highlighted: A_ONLY + B_ONLY,
    explanation:
      "A△B means \"A or B, but not both\": elements in exactly one of the two sets. It excludes the intersection. Equivalent to (A∪B) ∖ (A∩B).",
  },
];

export default function VennDiagramBuilder({ onAdjust }: VennDiagramBuilderProps) {
  const [operation, setOperation] = useState<SetOpType>("union");

  function handleOp(op: SetOpType) {
    setOperation(op);
    onAdjust();
  }

  const cfg = OPS.find((o) => o.id === operation)!;

  // Per-operation border colors
  const strokeA =
    operation === "complement" || operation === "difference" || operation === "symmetric_difference"
      ? operation === "complement"
        ? "#475569"
        : GOLD
      : GOLD;
  const strokeB =
    operation === "union" || operation === "intersection" || operation === "symmetric_difference"
      ? GOLD
      : "#475569";

  return (
    <div className="space-y-5">
      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Set operation">
        {OPS.map((op) => (
          <button
            key={op.id}
            role="radio"
            aria-checked={operation === op.id}
            onClick={() => handleOp(op.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              operation === op.id
                ? "bg-[var(--color-accent)] text-[#0a0e1a] border-[var(--color-accent)]"
                : "border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
            }`}
          >
            {op.label}{" "}
            <span className="font-mono text-xs opacity-70">({op.symbol})</span>
          </button>
        ))}
      </div>

      {/* Venn SVG */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4 flex flex-col items-center">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full max-w-[380px]">
          <defs>
            {/* Clip paths */}
            <clipPath id="venn-clipA">
              <circle cx={CX_A} cy={CY} r={R} />
            </clipPath>
            <clipPath id="venn-clipB">
              <circle cx={CX_B} cy={CY} r={R} />
            </clipPath>

            {/* Mask: A-only (A minus B) */}
            <mask id="venn-maskAminusB">
              <circle cx={CX_A} cy={CY} r={R} fill="white" />
              <circle cx={CX_B} cy={CY} r={R} fill="black" />
            </mask>

            {/* Mask: B-only (B minus A) */}
            <mask id="venn-maskBminusA">
              <circle cx={CX_B} cy={CY} r={R} fill="white" />
              <circle cx={CX_A} cy={CY} r={R} fill="black" />
            </mask>

            {/* Mask: complement of A — universe rectangle minus circle A */}
            <mask id="venn-maskCompA">
              <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="white" />
              <circle cx={CX_A} cy={CY} r={R} fill="black" />
            </mask>
          </defs>

          {/* Universe border (always visible) */}
          <rect
            x={4} y={4} width={SVG_W - 8} height={SVG_H - 8} rx={12}
            fill="none" stroke="#334155" strokeWidth={1.5}
          />
          <text x={12} y={22} fontSize={11} fill="#334155" fontFamily="monospace">
            U={U}
          </text>

          {/* ── Highlighted regions ── */}

          {/* UNION: A-only + intersection + B-only */}
          {operation === "union" && (
            <>
              <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={GOLD} fillOpacity={FO} mask="url(#venn-maskAminusB)" />
              <circle cx={CX_A} cy={CY} r={R} fill={GOLD} fillOpacity={FO} clipPath="url(#venn-clipB)" />
              <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={GOLD} fillOpacity={FO} mask="url(#venn-maskBminusA)" />
            </>
          )}

          {/* INTERSECTION: only the overlap */}
          {operation === "intersection" && (
            <circle cx={CX_A} cy={CY} r={R} fill={GOLD} fillOpacity={0.5} clipPath="url(#venn-clipB)" />
          )}

          {/* COMPLEMENT: universe minus A — gold everywhere except inside A */}
          {operation === "complement" && (
            <>
              {/* Gold region = universe rect minus circle A */}
              <rect
                x={4} y={4} width={SVG_W - 8} height={SVG_H - 8} rx={12}
                fill={GOLD} fillOpacity={0.28}
                mask="url(#venn-maskCompA)"
              />
              {/* Circle A filled dark to visually "remove" it */}
              <circle cx={CX_A} cy={CY} r={R} fill="#0a0e1a" fillOpacity={0.75} />
            </>
          )}

          {/* DIFFERENCE (A∖B): A-only */}
          {operation === "difference" && (
            <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={GOLD} fillOpacity={FO} mask="url(#venn-maskAminusB)" />
          )}

          {/* SYMMETRIC DIFFERENCE (A△B): A-only + B-only, no intersection */}
          {operation === "symmetric_difference" && (
            <>
              <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={GOLD} fillOpacity={FO} mask="url(#venn-maskAminusB)" />
              <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={GOLD} fillOpacity={FO} mask="url(#venn-maskBminusA)" />
            </>
          )}

          {/* ── Circle borders (drawn on top of fills) ── */}
          <circle
            cx={CX_A} cy={CY} r={R}
            fill="none"
            stroke={strokeA}
            strokeWidth={operation === "complement" ? 1 : 2}
            strokeDasharray={operation === "complement" ? "5 3" : undefined}
            opacity={operation === "complement" ? 0.5 : 1}
          />
          <circle
            cx={CX_B} cy={CY} r={R}
            fill="none"
            stroke={strokeB}
            strokeWidth={strokeB === GOLD ? 2 : 1.5}
            opacity={strokeB === "#475569" ? 0.5 : 1}
          />

          {/* Labels */}
          <text
            x={CX_A - 28} y={CY + 4}
            fontSize={15} fontWeight="bold"
            fill={operation === "complement" ? "#475569" : "#94a3b8"}
            textAnchor="middle"
          >
            A
          </text>
          <text x={CX_B + 28} y={CY + 4} fontSize={15} fontWeight="bold" fill="#94a3b8" textAnchor="middle">
            B
          </text>

          {/* Count labels */}
          <text x={CX_A - 26} y={CY + 22} fontSize={11} fill="#475569" textAnchor="middle">{A_ONLY}</text>
          <text x={(CX_A + CX_B) / 2} y={CY + 5} fontSize={11} fill="#475569" textAnchor="middle">{INTER}</text>
          <text x={CX_B + 26} y={CY + 22} fontSize={11} fill="#475569" textAnchor="middle">{B_ONLY}</text>
          <text x={SVG_W - 30} y={SVG_H - 12} fontSize={11} fill="#334155" textAnchor="end">
            neither: {NEITHER}
          </text>
        </svg>

        {/* Formula */}
        <div className="mt-3 rounded-lg border border-[#1e293b] bg-[#0f172a] px-4 py-2 text-center">
          <p className="text-[12px] font-mono text-[var(--color-accent)]">{cfg.formula}</p>
          <p className="text-[11px] text-[#94a3b8] mt-0.5">{cfg.formulaValue}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "|A|", value: 50, color: "var(--color-accent)" },
          { label: "|B|", value: 40, color: "#3bb4a4" },
          { label: "|A∩B|", value: 20, color: "#a855f7" },
          { label: "Highlighted", value: cfg.highlighted, color: "var(--color-warning)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Per-operation explanation */}
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
        <p className="text-[13px] text-[#94a3b8] leading-relaxed">{cfg.explanation}</p>
      </div>
    </div>
  );
}
