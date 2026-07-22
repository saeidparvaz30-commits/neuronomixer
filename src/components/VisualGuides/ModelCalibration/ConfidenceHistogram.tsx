"use client";

import React from "react";
import type { ReliabilityBin } from "./types";

interface Props {
  bins: ReliabilityBin[];
  n: number;
  viewLabel: string;
}

const W = 520;
const H = 214;
const M = { top: 24, right: 14, bottom: 52, left: 44 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

function ConfidenceHistogramInner({ bins, n, viewLabel }: Props) {
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const busiest = bins.reduce((acc, b) => (b.count > acc.count ? b : acc), bins[0]);

  const summary =
    `Confidence histogram for the ${viewLabel} scores: ${n} predictions across 10 bins. ` +
    `Most populated bin is ${busiest.lo.toFixed(1)} to ${busiest.hi.toFixed(1)} with ${busiest.count} predictions.`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
      {bins.map((b, i) => {
        const bw = PW / bins.length - 4;
        const bx = M.left + (i * PW) / bins.length + 2;
        const bh = (b.count / maxCount) * PH;
        return (
          <g key={b.lo}>
            <rect
              x={bx}
              y={M.top + PH - bh}
              width={bw}
              height={bh}
              fill="#a855f7"
              opacity={0.65}
            >
              <title>{`Bin ${b.lo.toFixed(1)} to ${b.hi.toFixed(1)}: ${b.count} predictions`}</title>
            </rect>
            {b.count > 0 && (
              <text
                x={bx + bw / 2}
                y={M.top + PH - bh - 4}
                textAnchor="middle"
                fontSize={16}
                fill="#94a3b8"
              >
                {b.count}
              </text>
            )}
            <text
              x={bx + bw / 2}
              y={H - M.bottom + 18}
              textAnchor="middle"
              fontSize={16}
              fill="#475569"
            >
              {b.lo.toFixed(1)}
            </text>
          </g>
        );
      })}
      <line
        x1={M.left}
        y1={M.top + PH}
        x2={M.left + PW}
        y2={M.top + PH}
        stroke="#334155"
        strokeWidth={1}
      />
      <text x={M.left + PW / 2} y={H - 6} textAnchor="middle" fontSize={17} fill="#94a3b8">
        Predicted probability
      </text>
      <text
        x={16}
        y={M.top + PH / 2}
        textAnchor="middle"
        fontSize={17}
        fill="#94a3b8"
        transform={`rotate(-90 16 ${M.top + PH / 2})`}
      >
        Count
      </text>
    </svg>
  );
}

const ConfidenceHistogram = React.memo(ConfidenceHistogramInner);
export default ConfidenceHistogram;
