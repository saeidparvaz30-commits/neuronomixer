"use client";

import React from "react";
import { MAX_ROUNDS } from "./boostMath";

const W = 640;
const H = 240;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 30;

function sx(m: number): number {
  return PAD_L + (m / MAX_ROUNDS) * (W - PAD_L - PAD_R);
}

interface ErrorChartProps {
  /** MSE after m trees; index 0 is the constant baseline F0. */
  trainMse: number[];
  testMse: number[];
  round: number;
  /** Deep tree test MSE reference line; null when the overlay is off. */
  deepTestMse: number | null;
}

export default function ErrorChart({
  trainMse,
  testMse,
  round,
  deepTestMse,
}: ErrorChartProps) {
  const yTop =
    Math.max(trainMse[0], testMse[0], deepTestMse ?? 0) * 1.08;

  function sy(v: number): number {
    const c = Math.max(0, Math.min(yTop, v));
    return PAD_T + ((yTop - c) / yTop) * (H - PAD_T - PAD_B);
  }

  function line(vals: number[]): string {
    return vals
      .slice(0, round + 1)
      .map((v, m) => `${sx(m).toFixed(2)},${sy(v).toFixed(2)}`)
      .join(" ");
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yTop);
  const xTicks = [0, 15, 30, 45, 60];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Training and test MSE versus boosting rounds, drawn up to round ${round}. Current train MSE ${trainMse[
          round
        ].toFixed(3)}, test MSE ${testMse[round].toFixed(3)}${
          deepTestMse !== null
            ? `, deep tree test MSE reference ${deepTestMse.toFixed(3)}`
            : ""
        }.`}
      >
        {yTicks.map((t) => (
          <g key={`y${t.toFixed(3)}`}>
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
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text
            key={`x${t}`}
            x={sx(t).toFixed(2)}
            y={H - PAD_B + 14}
            textAnchor="middle"
            fontSize={10}
            fill="#475569"
          >
            {t}
          </text>
        ))}
        <text
          x={(W + PAD_L - PAD_R) / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fill="#475569"
        >
          boosting rounds
        </text>

        {/* Deep tree test MSE reference */}
        {deepTestMse !== null && (
          <g>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={sy(deepTestMse).toFixed(2)}
              y2={sy(deepTestMse).toFixed(2)}
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="2 4"
            />
            <text
              x={W - PAD_R - 2}
              y={Number(sy(deepTestMse).toFixed(2)) - 5}
              textAnchor="end"
              fontSize={9}
              fill="#a855f7"
            >
              deep tree test MSE {deepTestMse.toFixed(3)}
            </text>
          </g>
        )}

        {/* Train and test curves */}
        {round >= 1 && (
          <>
            <polyline
              points={line(trainMse)}
              fill="none"
              stroke="#3bb4a4"
              strokeWidth={2}
            />
            <polyline
              points={line(testMse)}
              fill="none"
              stroke="var(--color-warning)"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
          </>
        )}

        {/* Current round markers */}
        <circle
          cx={sx(round).toFixed(2)}
          cy={sy(trainMse[round]).toFixed(2)}
          r={4}
          fill="#3bb4a4"
        />
        <circle
          cx={sx(round).toFixed(2)}
          cy={sy(testMse[round]).toFixed(2)}
          r={4}
          fill="var(--color-warning)"
        />
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="#3bb4a4" strokeWidth="2" />
          </svg>
          train MSE (solid)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="5 3" />
          </svg>
          test MSE (dashed, 60 held-out points)
        </span>
        {deepTestMse !== null && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="22" y2="4" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2 4" />
            </svg>
            single deep tree test MSE (dotted)
          </span>
        )}
      </div>
    </div>
  );
}
