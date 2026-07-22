"use client";

import React from "react";
import { motion } from "framer-motion";
import { CurvePoint, CATEGORY_ACCENT } from "./corpus";

type Props = {
  reference: CurvePoint[];
  current: { falsePositiveRate: number; blockRate: number; label: string };
};

// Plot geometry
const W = 340;
const H = 300;
const PAD_L = 46;
const PAD_B = 40;
const PAD_T = 16;
const PAD_R = 16;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function x(fpr: number): number {
  return PAD_L + fpr * PLOT_W;
}
function y(block: number): number {
  return PAD_T + (1 - block) * PLOT_H;
}

export default function TradeoffCurve({ reference, current }: Props) {
  const cx = x(current.falsePositiveRate);
  const cy = y(current.blockRate);
  const maxSingleLayerBlock = Math.max(
    ...reference.filter((p) => p.id !== "full").map((p) => p.blockRate),
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="w-full max-w-[380px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Tradeoff plot. Current configuration blocks ${Math.round(
            current.blockRate * 100,
          )} percent of attacks with a ${Math.round(
            current.falsePositiveRate * 100,
          )} percent false-positive rate.`}
        >
          {/* Grid + axes */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={`gx-${t}`}>
              <line
                x1={x(t)}
                y1={PAD_T}
                x2={x(t)}
                y2={PAD_T + PLOT_H}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text x={x(t)} y={H - PAD_B + 16} fill="#475569" fontSize={11} textAnchor="middle">
                {Math.round(t * 100)}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={`gy-${t}`}>
              <line
                x1={PAD_L}
                y1={y(t)}
                x2={PAD_L + PLOT_W}
                y2={y(t)}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text x={PAD_L - 8} y={y(t) + 4} fill="#475569" fontSize={11} textAnchor="end">
                {Math.round(t * 100)}
              </text>
            </g>
          ))}

          {/* Ideal corner marker (top-left: high block, low FP) */}
          <text x={PAD_L + 2} y={PAD_T + 13} fill="#22c55e" fontSize={11}>
            ideal
          </text>

          {/* Axis labels */}
          <text
            x={PAD_L + PLOT_W / 2}
            y={H - 4}
            fill="#94a3b8"
            fontSize={12}
            textAnchor="middle"
          >
            False-positive rate (% benign blocked)
          </text>
          <text
            x={12}
            y={PAD_T + PLOT_H / 2}
            fill="#94a3b8"
            fontSize={12}
            textAnchor="middle"
            transform={`rotate(-90 12 ${PAD_T + PLOT_H / 2})`}
          >
            Block rate (% attacks blocked)
          </text>

          {/* Reference ghost points */}
          {reference.map((p) => (
            <g key={p.id}>
              <circle
                cx={x(p.falsePositiveRate)}
                cy={y(p.blockRate)}
                r={p.id === "full" ? 5 : 4}
                fill={p.id === "full" ? "#a855f7" : "#334155"}
                stroke={p.id === "full" ? "#a855f7" : "#475569"}
                strokeWidth={1}
                opacity={0.85}
              />
            </g>
          ))}

          {/* Current live config point */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={7}
            fill={CATEGORY_ACCENT}
            stroke="#0f172a"
            strokeWidth={2}
            animate={{ cx, cy }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: CATEGORY_ACCENT }}
            />
            <span className="text-white">
              Your live config: {Math.round(current.blockRate * 100)}% blocked,{" "}
              {Math.round(current.falsePositiveRate * 100)}% false positives
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0 bg-[#334155] border border-[#475569]" />
            <span className="text-[#94a3b8]">Each single layer alone (fixed reference)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0 bg-[#a855f7]" />
            <span className="text-[#94a3b8]">All four layers at threshold 1</span>
          </div>
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
          The ideal is the top-left corner: every attack blocked, no benign request touched.
          Every single-layer point sits low, none passes{" "}
          {Math.round(maxSingleLayerBlock * 100)}% block rate. Stacking layers lifts
          the block rate, and raising thresholds pulls the point back toward the left.
        </p>
      </div>
    </div>
  );
}
