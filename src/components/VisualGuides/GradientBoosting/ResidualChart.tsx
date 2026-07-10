"use client";

import React from "react";
import { TRAIN, GRID_XS } from "./boostMath";

const W = 640;
const H = 230;
const PAD_L = 42;
const PAD_R = 14;
const PAD_T = 12;
const PAD_B = 26;

const BASE = TRAIN.ys.reduce((a, b) => a + b, 0) / TRAIN.ys.length;
/** Fixed symmetric domain from the round-0 residuals, so shrinkage is visible. */
const R_MAX = Math.max(...TRAIN.ys.map((y) => Math.abs(y - BASE))) + 0.4;

function sx(x: number): number {
  return PAD_L + x * (W - PAD_L - PAD_R);
}

function sy(r: number): number {
  const c = Math.max(-R_MAX, Math.min(R_MAX, r));
  return PAD_T + ((R_MAX - c) / (2 * R_MAX)) * (H - PAD_T - PAD_B);
}

interface ResidualChartProps {
  /** Current residuals y_i - F_m(x_i) on the training points. */
  residuals: number[];
  /** Raw prediction on GRID_XS of the tree the next Step would add, or null. */
  nextTree: number[] | null;
  residualRms: number;
}

export default function ResidualChart({
  residuals,
  nextTree,
  residualRms,
}: ResidualChartProps) {
  const yTicks = [-2, -1, 0, 1, 2].filter((t) => Math.abs(t) <= R_MAX);
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Residual scatter for the current ensemble. Residual RMSE is ${residualRms.toFixed(
          3
        )}. The dashed overlay shows the tree the next Step would fit to these residuals.`}
      >
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={sy(t).toFixed(2)}
              y2={sy(t).toFixed(2)}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 6}
              y={sy(t).toFixed(2)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="#475569"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Zero line */}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={sy(0).toFixed(2)}
          y2={sy(0).toFixed(2)}
          stroke="#334155"
          strokeWidth={1.25}
        />
        <text
          x={W - PAD_R - 2}
          y={Number(sy(0).toFixed(2)) - 5}
          textAnchor="end"
          fontSize={9}
          fill="#475569"
        >
          residual = 0
        </text>

        {/* Next tree fit to the current residuals */}
        {nextTree && (
          <polyline
            points={GRID_XS.map(
              (x, i) => `${sx(x).toFixed(2)},${sy(nextTree[i]).toFixed(2)}`
            ).join(" ")}
            fill="none"
            stroke="#ec4899"
            strokeWidth={1.75}
            strokeDasharray="5 3"
          />
        )}

        {/* Residual points */}
        {TRAIN.xs.map((x, i) => (
          <circle
            key={i}
            cx={sx(x).toFixed(2)}
            cy={sy(residuals[i]).toFixed(2)}
            r={3}
            fill="var(--color-warning)"
            fillOpacity={0.8}
          />
        ))}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="8" aria-hidden="true">
            <circle cx="9" cy="4" r="3" fill="var(--color-warning)" fillOpacity={0.8} />
          </svg>
          current residuals (dots)
        </span>
        {nextTree && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="22" y2="4" stroke="#ec4899" strokeWidth="1.75" strokeDasharray="5 3" />
            </svg>
            next tree&apos;s fit (dashed): Step adds lr times this
          </span>
        )}
      </div>
    </div>
  );
}
