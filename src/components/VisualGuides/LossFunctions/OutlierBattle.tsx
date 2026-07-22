"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  datasetWithOutlier,
  fitOLS,
  fitL1,
  totalSquaredError,
  totalAbsoluteError,
  BASE_POINTS,
  OUTLIER_INDEX,
  OUTLIER_Y,
  fmt,
} from "./types";

interface Props {
  onOutlierOn: () => void;
}

// Chart geometry (viewBox units)
const W = 640;
const H = 356;
const L = 46;
const R = 624;
const T = 16;
const B = 302;
const X_MIN = 0;
const X_MAX = 13;
const Y_MIN = 0;
const Y_MAX = 26;

function px(x: number): number {
  return L + ((x - X_MIN) / (X_MAX - X_MIN)) * (R - L);
}

function py(y: number): number {
  return B - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (B - T);
}

const VARIANTS = [
  { id: "clean", label: "Clean data (12 points)" },
  { id: "outlier", label: "With one outlier" },
] as const;

type VariantId = (typeof VARIANTS)[number]["id"];

export default function OutlierBattle({ onOutlierOn }: Props) {
  const [variant, setVariant] = useState<VariantId>("clean");
  const outlierOn = variant === "outlier";

  const points = useMemo(() => datasetWithOutlier(outlierOn), [outlierOn]);
  const ols = useMemo(() => fitOLS(points), [points]);
  const l1 = useMemo(() => fitL1(points), [points]);

  const rows = [
    {
      name: "Least-squares line (minimizes MSE)",
      line: ols,
      color: "#ef4444",
      dash: undefined as string | undefined,
    },
    {
      name: "L1-optimal line (minimizes MAE)",
      line: l1,
      color: "#3bb4a4",
      dash: "6 4",
    },
  ].map((r) => ({
    ...r,
    sse: totalSquaredError(points, r.line),
    sae: totalAbsoluteError(points, r.line),
  }));

  const minSse = Math.min(...rows.map((r) => r.sse));
  const minSae = Math.min(...rows.map((r) => r.sae));

  function handleVariant(id: VariantId) {
    setVariant(id);
    if (id === "outlier") onOutlierOn();
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-white mb-1">
          Interactive B: The Outlier Stress Test
        </p>
        <p className="text-[12px] text-[#475569] leading-relaxed">
          Twelve fixed points near y = 2 + 0.8x. Toggle the outlier and watch which fitted
          line chases it. Both lines and both error totals are recomputed live from the
          visible points.
        </p>
      </div>

      {/* Variant toggle */}
      <div
        role="radiogroup"
        aria-label="Dataset variant"
        className="inline-flex rounded-xl border border-[#1e293b] bg-[#162032] p-1 gap-1 mb-4"
      >
        {VARIANTS.map((v) => {
          const active = variant === v.id;
          return (
            <button
              key={v.id}
              role="radio"
              aria-checked={active}
              onClick={() => handleVariant(v.id)}
              className={`relative px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                active ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="loss-outlier-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "var(--color-accent)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scatter + fitted lines */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Scatter plot of 12 points with two fitted lines. Least-squares line: y = ${fmt(ols.intercept)} + ${fmt(ols.slope)}x. L1-optimal line: y = ${fmt(l1.intercept)} + ${fmt(l1.slope)}x.${outlierOn ? " Outlier active at x = 10." : ""}`}
      >
        <defs>
          <clipPath id="outlier-battle-clip">
            <rect x={L} y={T} width={R - L} height={B - T} />
          </clipPath>
        </defs>

        {/* Grid */}
        {[0, 5, 10, 15, 20, 25].map((t) => (
          <g key={`y${t}`}>
            <line x1={L} y1={py(t)} x2={R} y2={py(t)} stroke="#1e293b" strokeWidth={1} />
            <text x={L - 8} y={py(t) + 6} textAnchor="end" fontSize={20} fill="#475569">
              {t}
            </text>
          </g>
        ))}
        {[0, 2, 4, 6, 8, 10, 12].map((t) => (
          <text key={`x${t}`} x={px(t)} y={B + 22} textAnchor="middle" fontSize={20} fill="#475569">
            {t}
          </text>
        ))}
        <text x={(L + R) / 2} y={H - 6} textAnchor="middle" fontSize={32} fill="#94a3b8">
          x
        </text>
        <text x={18} y={(T + B) / 2} textAnchor="middle" fontSize={32} fill="#94a3b8" transform={`rotate(-90 18 ${(T + B) / 2})`}>
          y
        </text>

        <g clipPath="url(#outlier-battle-clip)">
          {/* Fitted lines drawn across the full x domain */}
          <line
            x1={px(X_MIN)}
            y1={py(ols.intercept + ols.slope * X_MIN)}
            x2={px(X_MAX)}
            y2={py(ols.intercept + ols.slope * X_MAX)}
            stroke="#ef4444"
            strokeWidth={2.5}
          />
          <line
            x1={px(X_MIN)}
            y1={py(l1.intercept + l1.slope * X_MIN)}
            x2={px(X_MAX)}
            y2={py(l1.intercept + l1.slope * X_MAX)}
            stroke="#3bb4a4"
            strokeWidth={2.5}
            strokeDasharray="6 4"
          />

          {/* Points */}
          {points.map((p, i) => {
            const isOutlier = outlierOn && i === OUTLIER_INDEX;
            return (
              <g key={i}>
                <circle
                  cx={px(p.x)}
                  cy={py(p.y)}
                  r={isOutlier ? 6.5 : 4.5}
                  fill={isOutlier ? "var(--color-warning)" : "#94a3b8"}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
                {isOutlier && (
                  <text x={px(p.x)} y={py(p.y) - 12} textAnchor="middle" fontSize={20} fontWeight={600} fill="var(--color-warning)">
                    outlier ({p.x}, {p.y})
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend with computed equations */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-1.5 mt-2 mb-4">
        {rows.map((r) => (
          <span key={r.name} className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
            <svg width="22" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="22" y2="3" stroke={r.color} strokeWidth="2.5" strokeDasharray={r.dash} />
            </svg>
            {r.name}: <span className="font-mono text-[#f1f5f9]">y = {fmt(r.line.intercept)} + {fmt(r.line.slope)}x</span>
          </span>
        ))}
      </div>

      {/* Totals table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-[#1e293b] text-left">
              <th className="px-3 py-2 font-semibold text-[#f1f5f9] rounded-l-lg">Fitted line</th>
              <th className="px-3 py-2 font-semibold text-[#f1f5f9]">Total squared error</th>
              <th className="px-3 py-2 font-semibold text-[#f1f5f9] rounded-r-lg">Total absolute error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                <td className="px-3 py-2 text-[#94a3b8]">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: r.color }} />
                  {r.name}
                </td>
                <td className="px-3 py-2 font-mono">
                  <span style={{ color: r.sse === minSse ? "var(--color-success)" : "#94a3b8" }}>
                    {fmt(r.sse)}
                    {r.sse === minSse ? " (lower)" : ""}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono">
                  <span style={{ color: r.sae === minSae ? "var(--color-success)" : "#94a3b8" }}>
                    {fmt(r.sae)}
                    {r.sae === minSae ? " (lower)" : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
        Each line wins its own metric: least squares always has the lowest total squared error,
        the L1 line always has the lowest total absolute error. The lesson is in the slope: the
        outlier lifts one point from y = {fmt(BASE_POINTS[OUTLIER_INDEX].y)} to y = {fmt(OUTLIER_Y, 0)},
        a jump of {fmt(OUTLIER_Y - BASE_POINTS[OUTLIER_INDEX].y, 1)} units whose squared penalty
        ({fmt((OUTLIER_Y - BASE_POINTS[OUTLIER_INDEX].y) ** 2, 0)} if the line ignored it) outweighs
        every other residual combined, so the red line tilts toward it. Under absolute error the same
        jump only costs {fmt(OUTLIER_Y - BASE_POINTS[OUTLIER_INDEX].y, 1)}, so the dashed line barely
        moves. Fit method: least squares is the closed-form solution; the L1 line is found by a
        coarse-to-fine grid search over slope and intercept, computed live in your browser.
      </p>
    </div>
  );
}
