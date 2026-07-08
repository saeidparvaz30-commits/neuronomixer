"use client";

import React from "react";
import { motion } from "framer-motion";
import { HOUSES, CATEGORIES, ordinalCode, ComparisonFits } from "./types";

interface Props {
  fits: ComparisonFits;
  revealed: boolean;
  onRun: () => void;
}

const W = 560;
const H = 330;
const M = { top: 18, right: 16, bottom: 48, left: 52 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const Y_MIN = 220;
const Y_MAX = 450;

function xPos(code: number) {
  return M.left + ((code + 0.5) / 4) * PW;
}
function yPos(price: number) {
  return M.top + (1 - (price - Y_MIN) / (Y_MAX - Y_MIN)) * PH;
}

function FitComparisonInner({ fits, revealed, onRun }: Props) {
  // Deterministic horizontal offsets: spread houses within their category.
  const withinIndex = new Map<number, number>();
  const seen = new Map<string, number>();
  HOUSES.forEach((h, i) => {
    const j = seen.get(h.neighborhood) ?? 0;
    withinIndex.set(i, j);
    seen.set(h.neighborhood, j + 1);
  });
  const counts = new Map<string, number>();
  HOUSES.forEach((h) => counts.set(h.neighborhood, (counts.get(h.neighborhood) ?? 0) + 1));

  const [a, b] = fits.ordinal.beta;
  const summary =
    `Scatter of 12 house prices by neighborhood code 0 to 3. ` +
    `The ordinal fit is the straight line price = ${a.toFixed(1)} + ${b.toFixed(1)} times code ` +
    `with R squared ${fits.ordinal.r2.toFixed(3)}. The one-hot fit predicts each category mean ` +
    `(${fits.meansByCode.map((m, i) => `${CATEGORIES[i]} ${m.toFixed(0)}`).join(", ")}) ` +
    `with R squared ${fits.oneHot.r2.toFixed(3)}.`;

  if (!revealed) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          Two least-squares fits on the same 12 rows, solved exactly with the normal
          equations. One regresses price on the single ordinal code. The other regresses
          price on the four one-hot columns. Before running it, note that the category
          mean prices go up, down, then up again along the alphabetical codes.
        </p>
        <button
          onClick={onRun}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          Run the fit comparison
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
        {/* Gridlines */}
        {[250, 300, 350, 400, 450].map((p) => (
          <g key={p}>
            <line x1={M.left} y1={yPos(p)} x2={W - M.right} y2={yPos(p)} stroke="#1e293b" strokeWidth={1} />
            <text x={M.left - 8} y={yPos(p) + 4} textAnchor="end" fontSize={10} fill="#475569">
              {p}
            </text>
          </g>
        ))}

        {/* Category tick labels */}
        {CATEGORIES.map((c, code) => (
          <text
            key={c}
            x={xPos(code)}
            y={H - M.bottom + 18}
            textAnchor="middle"
            fontSize={10}
            fill="#94a3b8"
          >
            {c} ({code})
          </text>
        ))}

        {/* Ordinal fitted line across the code range */}
        <line
          x1={xPos(-0.35)}
          y1={yPos(a + b * -0.35)}
          x2={xPos(3.35)}
          y2={yPos(a + b * 3.35)}
          stroke="#a855f7"
          strokeWidth={2}
        />

        {/* One-hot predictions: one horizontal segment per category mean */}
        {fits.meansByCode.map((mean, code) => (
          <line
            key={code}
            x1={xPos(code - 0.28)}
            y1={yPos(mean)}
            x2={xPos(code + 0.28)}
            y2={yPos(mean)}
            stroke="#3bb4a4"
            strokeWidth={2.5}
            strokeDasharray="6 3"
          />
        ))}

        {/* Data points, deterministically jittered within category */}
        {HOUSES.map((h, i) => {
          const code = ordinalCode(h.neighborhood);
          const count = counts.get(h.neighborhood) ?? 1;
          const off = ((withinIndex.get(i) ?? 0) - (count - 1) / 2) * 0.14;
          return (
            <circle
              key={i}
              cx={xPos(code + off)}
              cy={yPos(h.price)}
              r={4}
              fill="#f1f5f9"
              opacity={0.85}
            >
              <title>{`${h.neighborhood}: $${h.price}k`}</title>
            </circle>
          );
        })}

        {/* Axes */}
        <line x1={M.left} y1={yPos(Y_MIN)} x2={W - M.right} y2={yPos(Y_MIN)} stroke="#334155" strokeWidth={1} />
        <line x1={M.left} y1={yPos(Y_MIN)} x2={M.left} y2={M.top} stroke="#334155" strokeWidth={1} />
        <text x={M.left + PW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#94a3b8">
          Neighborhood (ordinal code in parentheses)
        </text>
        <text
          x={14}
          y={M.top + PH / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#94a3b8"
          transform={`rotate(-90 14 ${M.top + PH / 2})`}
        >
          Price ($k)
        </text>
      </svg>

      {/* Legend: shape plus text, never color alone */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 mb-4">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f1f5f9]" aria-hidden="true" />
          House sale
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="#a855f7" strokeWidth="2" />
          </svg>
          Ordinal fit (one straight line)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="#3bb4a4" strokeWidth="2.5" strokeDasharray="6 3" />
          </svg>
          One-hot fit (category means)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Ordinal R²</p>
          <p className="text-xl font-black font-mono text-[#a855f7]">
            {fits.ordinal.r2.toFixed(3)}
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">
            forced slope: {b >= 0 ? "+" : ""}
            {b.toFixed(1)} $k per alphabetical step
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">One-hot R²</p>
          <p className="text-xl font-black font-mono text-[#3bb4a4]">
            {fits.oneHot.r2.toFixed(3)}
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">predicts each category mean</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-[#475569] mb-1">Variance left on the table</p>
          <p className="text-xl font-black font-mono text-[var(--color-accent)]">
            {((fits.oneHot.r2 - fits.ordinal.r2) * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">R² gap from the fake order</p>
        </div>
      </div>
    </motion.div>
  );
}

const FitComparison = React.memo(FitComparisonInner);
export default FitComparison;
