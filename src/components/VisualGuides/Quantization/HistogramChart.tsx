"use client";

import React from "react";
import { formatSmall, type HistogramBin } from "./types";

export interface HistogramSeries {
  label: string;
  color: string;
  bins: HistogramBin[];
}

interface Props {
  series: HistogramSeries[];
  xMin: number;
  xMax: number;
  height?: number;
  ariaLabel: string;
}

const W = 600;

export default function HistogramChart({ series, xMin, xMax, height = 170, ariaLabel }: Props) {
  const plotH = height - 22;
  const maxCount = Math.max(1, ...series.flatMap((s) => s.bins.map((b) => b.count)));
  const zeroX = xMin < 0 && xMax > 0 ? ((0 - xMin) / (xMax - xMin)) * W : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={ariaLabel}
      >
        <line x1={0} y1={plotH} x2={W} y2={plotH} stroke="#334155" strokeWidth={1} />
        {zeroX !== null && (
          <line
            x1={zeroX}
            y1={0}
            x2={zeroX}
            y2={plotH}
            stroke="#334155"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
        {series.map((s, si) => {
          const n = s.bins.length;
          const binW = W / n;
          const barW = si === 0 ? Math.max(1, binW - 1) : Math.max(1, (binW - 1) * 0.5);
          const offset = si === 0 ? 0.5 : (binW - barW) / 2;
          return (
            <g key={s.label}>
              {s.bins.map((b, i) => {
                const h = (b.count / maxCount) * (plotH - 6);
                if (h <= 0) return null;
                return (
                  <rect
                    key={i}
                    x={i * binW + offset}
                    y={plotH - h}
                    width={barW}
                    height={h}
                    fill={s.color}
                    fillOpacity={si === 0 ? 0.45 : 0.95}
                    rx={1}
                  />
                );
              })}
            </g>
          );
        })}
        <text x={2} y={height - 6} fill="#475569" fontSize={10}>
          {formatSmall(xMin)}
        </text>
        {zeroX !== null && (
          <text x={zeroX} y={height - 6} fill="#475569" fontSize={10} textAnchor="middle">
            0
          </text>
        )}
        <text x={W - 2} y={height - 6} fill="#475569" fontSize={10} textAnchor="end">
          {formatSmall(xMax)}
        </text>
      </svg>
      <div className="flex flex-wrap items-center gap-4 mt-2">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-[11px] text-[#94a3b8]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
