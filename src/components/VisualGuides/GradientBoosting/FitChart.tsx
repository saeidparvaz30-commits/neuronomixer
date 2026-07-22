"use client";

import React from "react";
import { TRAIN, GRID_XS, TRUE_GRID } from "./boostMath";

const W = 640;
const H = 300;
const PAD_L = 42;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 48;

const Y_MIN = Math.min(...TRAIN.ys, ...TRUE_GRID) - 0.5;
const Y_MAX = Math.max(...TRAIN.ys, ...TRUE_GRID) + 0.5;

function sx(x: number): number {
  return PAD_L + x * (W - PAD_L - PAD_R);
}

function sy(y: number): number {
  const c = Math.max(Y_MIN, Math.min(Y_MAX, y));
  return PAD_T + ((Y_MAX - c) / (Y_MAX - Y_MIN)) * (H - PAD_T - PAD_B);
}

function polyline(vals: number[]): string {
  return GRID_XS.map(
    (x, i) => `${sx(x).toFixed(2)},${sy(vals[i]).toFixed(2)}`
  ).join(" ");
}

const X_TICKS = [0, 0.25, 0.5, 0.75, 1];
const Y_TICKS = [-2, -1, 0, 1, 2];

interface FitChartProps {
  /** Ensemble prediction on GRID_XS after the current number of rounds. */
  ensemble: number[];
  /** Single deep tree prediction on GRID_XS, or null when the overlay is off. */
  deep: number[] | null;
  round: number;
}

export default function FitChart({ ensemble, deep, round }: FitChartProps) {
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Scatter plot of the 60 training points with the boosted ensemble prediction after ${round} ${
          round === 1 ? "round" : "rounds"
        }${deep ? ", plus a single deep tree overlay" : ""}. The exact error values are shown as text in the tiles above.`}
      >
        {/* Gridlines and ticks */}
        {Y_TICKS.map((t) => (
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
              fontSize={20}
              fill="#475569"
            >
              {t}
            </text>
          </g>
        ))}
        {X_TICKS.map((t) => (
          <g key={`x${t}`}>
            <line
              x1={sx(t).toFixed(2)}
              x2={sx(t).toFixed(2)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={sx(t).toFixed(2)}
              y={H - PAD_B + 20}
              textAnchor="middle"
              fontSize={20}
              fill="#475569"
            >
              {t}
            </text>
          </g>
        ))}
        <text
          x={(W + PAD_L - PAD_R) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={20}
          fill="#475569"
        >
          x
        </text>

        {/* True generating function */}
        <polyline
          points={polyline(TRUE_GRID)}
          fill="none"
          stroke="#475569"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Single deep tree overlay */}
        {deep && (
          <polyline
            points={polyline(deep)}
            fill="none"
            stroke="#a855f7"
            strokeWidth={1.75}
            strokeDasharray="6 4"
          />
        )}

        {/* Boosted ensemble */}
        <polyline
          points={polyline(ensemble)}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />

        {/* Training points */}
        {TRAIN.xs.map((x, i) => (
          <circle
            key={i}
            cx={sx(x).toFixed(2)}
            cy={sy(TRAIN.ys[i]).toFixed(2)}
            r={3}
            fill="#3bb4a4"
            fillOpacity={0.75}
          />
        ))}
      </svg>

      {/* Legend: dash pattern plus text, never color alone */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="8" aria-hidden="true">
            <circle cx="9" cy="4" r="3" fill="#3bb4a4" fillOpacity={0.75} />
          </svg>
          training points (dots)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="var(--color-accent)" strokeWidth="2" />
          </svg>
          boosted ensemble (solid)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          true function (short dash)
        </span>
        {deep && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="22" y2="4" stroke="#a855f7" strokeWidth="1.75" strokeDasharray="6 4" />
            </svg>
            single deep tree (long dash)
          </span>
        )}
      </div>
    </div>
  );
}
