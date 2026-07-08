"use client";

import React from "react";
import type { ReliabilityBin } from "./types";

interface Props {
  bins: ReliabilityBin[];
  ece: number;
  n: number;
  /** Which score set is being shown, for the accessible summary. */
  viewLabel: string;
}

const W = 520;
const H = 340;
const M = { top: 16, right: 14, bottom: 42, left: 48 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

function x(v: number) {
  return M.left + v * PW;
}
function y(v: number) {
  return M.top + (1 - v) * PH;
}

function ReliabilityDiagramInner({ bins, ece, n, viewLabel }: Props) {
  const nonEmpty = bins.filter((b) => b.count > 0);
  const worst = nonEmpty.reduce(
    (acc, b) => (Math.abs(b.gap) > Math.abs(acc.gap) ? b : acc),
    nonEmpty[0] ?? bins[0]
  );

  const summary =
    `Reliability diagram for the ${viewLabel} scores over ${n} predictions in 10 confidence bins. ` +
    `Expected calibration error ${(ece * 100).toFixed(1)} percent. ` +
    (nonEmpty.length > 0
      ? `Largest gap ${(Math.abs(worst.gap) * 100).toFixed(1)} percentage points in the ` +
        `${worst.lo.toFixed(1)} to ${worst.hi.toFixed(1)} confidence bin ` +
        `(mean confidence ${(worst.meanConfidence * 100).toFixed(0)} percent, ` +
        `observed accuracy ${(worst.empiricalAccuracy * 100).toFixed(0)} percent).`
      : "All bins are empty.");

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={summary}
      >
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={x(0)} y1={y(t)} x2={x(1)} y2={y(t)} stroke="#1e293b" strokeWidth={1} />
            <text x={x(0) - 8} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#475569">
              {t.toFixed(2)}
            </text>
            <text x={x(t)} y={H - M.bottom + 16} textAnchor="middle" fontSize={10} fill="#475569">
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Bars: observed accuracy, plus warning gap between accuracy and confidence */}
        {bins.map((b) => {
          if (b.count === 0) return null;
          const bx = x(b.lo) + 2;
          const bw = PW / bins.length - 4;
          const accTop = y(b.empiricalAccuracy);
          const confTop = y(b.meanConfidence);
          const gapTop = Math.min(accTop, confTop);
          const gapH = Math.abs(accTop - confTop);
          return (
            <g key={b.lo}>
              <rect
                x={bx}
                y={accTop}
                width={bw}
                height={y(0) - accTop}
                fill="#3bb4a4"
                opacity={0.7}
              >
                <title>
                  {`Bin ${b.lo.toFixed(1)} to ${b.hi.toFixed(1)}: ${b.count} predictions, mean confidence ${(b.meanConfidence * 100).toFixed(1)}%, observed accuracy ${(b.empiricalAccuracy * 100).toFixed(1)}%`}
                </title>
              </rect>
              {gapH > 0.5 && (
                <rect
                  x={bx}
                  y={gapTop}
                  width={bw}
                  height={gapH}
                  fill="var(--color-warning)"
                  opacity={0.32}
                />
              )}
              {/* Mean confidence marker inside the bin */}
              <line
                x1={bx}
                y1={confTop}
                x2={bx + bw}
                y2={confTop}
                stroke="var(--color-warning)"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            </g>
          );
        })}

        {/* Perfect-calibration diagonal */}
        <line
          x1={x(0)}
          y1={y(0)}
          x2={x(1)}
          y2={y(1)}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />

        {/* Axes */}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} stroke="#334155" strokeWidth={1} />
        <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(1)} stroke="#334155" strokeWidth={1} />
        <text x={x(0.5)} y={H - 6} textAnchor="middle" fontSize={11} fill="#94a3b8">
          Mean predicted probability (confidence)
        </text>
        <text
          x={14}
          y={y(0.5)}
          textAnchor="middle"
          fontSize={11}
          fill="#94a3b8"
          transform={`rotate(-90 14 ${y(0.5)})`}
        >
          Observed frequency (accuracy)
        </text>
      </svg>

      {/* Legend: shape + text, never color alone */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="inline-block w-3 h-3 rounded-[3px]" style={{ background: "#3bb4a4", opacity: 0.7 }} />
          Observed accuracy per bin
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span
            className="inline-block w-3 h-3 rounded-[3px]"
            style={{ background: "var(--color-warning)", opacity: 0.45 }}
          />
          Calibration gap (|accuracy - confidence|)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3" />
          </svg>
          Perfect calibration (y = x)
        </span>
      </div>
    </div>
  );
}

const ReliabilityDiagram = React.memo(ReliabilityDiagramInner);
export default ReliabilityDiagram;
