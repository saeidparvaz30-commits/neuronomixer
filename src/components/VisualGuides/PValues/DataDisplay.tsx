"use client";

import React, { useMemo } from "react";
import { mean } from "./types";

interface Props {
  groupA: number[];
  groupB: number[];
  pValue: number | null;
  alpha: number;
  effectSize: number;
}

const W = 400, H = 200;
const PAD = { l: 32, r: 24, t: 16, b: 32 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;
const MAX_DOTS = 30;

function seededJitter(i: number, groupOffset: number): number {
  return Math.sin(i * 7.391 + groupOffset * 3.1) * 12;
}

export default function DataDisplay({ groupA, groupB, pValue, alpha, effectSize }: Props) {
  const isEmpty = groupA.length === 0 && groupB.length === 0;

  const { dotsA, dotsB, minV, maxV, meanA, meanB } = useMemo(() => {
    if (isEmpty) {
      // Generate placeholder dots based on params
      const placeholderA = Array.from({ length: 10 }, (_, i) => 100 + Math.sin(i * 2.4) * 15);
      const placeholderB = Array.from({ length: 10 }, (_, i) => 100 + effectSize * 15 + Math.sin(i * 3.1) * 15);
      const all = [...placeholderA, ...placeholderB];
      const minV = Math.min(...all) - 5;
      const maxV = Math.max(...all) + 5;
      return {
        dotsA: placeholderA,
        dotsB: placeholderB,
        minV,
        maxV,
        meanA: mean(placeholderA),
        meanB: mean(placeholderB),
      };
    }
    const subsA = groupA.length > MAX_DOTS
      ? Array.from({ length: MAX_DOTS }, (_, i) => groupA[Math.floor(i * groupA.length / MAX_DOTS)])
      : groupA;
    const subsB = groupB.length > MAX_DOTS
      ? Array.from({ length: MAX_DOTS }, (_, i) => groupB[Math.floor(i * groupB.length / MAX_DOTS)])
      : groupB;
    const all = [...subsA, ...subsB];
    const minV = Math.min(...all) - 5;
    const maxV = Math.max(...all) + 5;
    return {
      dotsA: subsA,
      dotsB: subsB,
      minV,
      maxV,
      meanA: mean(groupA),
      meanB: mean(groupB),
    };
  }, [groupA, groupB, effectSize, isEmpty]);

  const range = maxV - minV || 1;
  const tx = (v: number) => PAD.l + ((v - minV) / range) * IW;

  // Group A dots at y ≈ 60 (top track), Group B at y ≈ 120 (bottom track)
  const rowA = PAD.t + IH * 0.28;
  const rowB = PAD.t + IH * 0.66;

  const isSignificant = pValue !== null && pValue < alpha;
  const diffColor = isEmpty ? "#94a3b8" : isSignificant ? "#3bb4a4" : "#ef4444";
  const diff = meanB - meanA;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Group Data
      </p>
      {isEmpty && (
        <p className="text-[10px] text-[#334155] mb-2">
          Showing preview: run the experiment to generate real data.
        </p>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block">
        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

        {/* Group labels */}
        <text x={PAD.l - 6} y={rowA + 4} textAnchor="end" fill="#3bb4a4" fontSize="9" fontWeight="600">A</text>
        <text x={PAD.l - 6} y={rowB + 4} textAnchor="end" fill="#1e5d8a" fontSize="9" fontWeight="600">B</text>

        {/* Group A dots */}
        {dotsA.map((v, i) => (
          <circle
            key={`a${i}`}
            cx={tx(v)}
            cy={rowA + seededJitter(i, 0)}
            r={3.5}
            fill="#3bb4a4"
            opacity={isEmpty ? "0.3" : "0.7"}
          />
        ))}

        {/* Group B dots */}
        {dotsB.map((v, i) => (
          <circle
            key={`b${i}`}
            cx={tx(v)}
            cy={rowB + seededJitter(i, 1)}
            r={3.5}
            fill="#1e5d8a"
            opacity={isEmpty ? "0.3" : "0.7"}
          />
        ))}

        {/* Mean lines */}
        <line
          x1={tx(meanA)} y1={rowA - 18}
          x2={tx(meanA)} y2={rowA + 18}
          stroke="var(--color-accent)" strokeWidth="2"
        />
        <text x={tx(meanA)} y={rowA - 22} textAnchor="middle" fill="var(--color-accent)" fontSize="8" fontWeight="600">
          Mean: {meanA.toFixed(1)}
        </text>

        <line
          x1={tx(meanB)} y1={rowB - 18}
          x2={tx(meanB)} y2={rowB + 18}
          stroke="var(--color-accent)" strokeWidth="2"
        />
        <text x={tx(meanB)} y={rowB + 30} textAnchor="middle" fill="var(--color-accent)" fontSize="8" fontWeight="600">
          Mean: {meanB.toFixed(1)}
        </text>

        {/* Difference bracket */}
        {!isEmpty && (
          <g>
            <line
              x1={tx(meanA)} y1={rowA + 22}
              x2={tx(meanA)} y2={(rowA + rowB) / 2}
              stroke={diffColor} strokeWidth="1" strokeDasharray="3 2"
            />
            <line
              x1={tx(meanB)} y1={rowB - 22}
              x2={tx(meanB)} y2={(rowA + rowB) / 2}
              stroke={diffColor} strokeWidth="1" strokeDasharray="3 2"
            />
            <line
              x1={Math.min(tx(meanA), tx(meanB))}
              y1={(rowA + rowB) / 2}
              x2={Math.max(tx(meanA), tx(meanB))}
              y2={(rowA + rowB) / 2}
              stroke={diffColor} strokeWidth="1.5"
            />
            <text
              x={(tx(meanA) + tx(meanB)) / 2}
              y={(rowA + rowB) / 2 - 5}
              textAnchor="middle"
              fill={diffColor}
              fontSize="9"
              fontWeight="700"
            >
              Δ = {diff.toFixed(1)}
            </text>
          </g>
        )}

        {/* X-axis ticks */}
        {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
          <text key={i} x={tx(v)} y={PAD.t + IH + 14} textAnchor="middle" fill="#475569" fontSize="8">
            {v.toFixed(0)}
          </text>
        ))}
      </svg>

      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3bb4a4]" />
          <span className="text-[10px] text-[#94a3b8]">Group A ({groupA.length || "—"})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1e5d8a]" />
          <span className="text-[10px] text-[#94a3b8]">Group B ({groupB.length || "—"})</span>
        </div>
        {pValue !== null && (
          <span
            className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-lg border"
            style={{
              color: isSignificant ? "#3bb4a4" : "#ef4444",
              borderColor: isSignificant ? "#3bb4a440" : "#ef444440",
              background: isSignificant ? "#3bb4a410" : "#ef444410",
            }}
          >
            {isSignificant ? "Significant" : "Not significant"} (p = {pValue < 0.001 ? "<0.001" : pValue.toFixed(3)})
          </span>
        )}
      </div>
    </div>
  );
}
