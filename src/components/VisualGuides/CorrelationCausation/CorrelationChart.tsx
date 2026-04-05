"use client";

import React, { useState } from "react";
import { linearRegression } from "./types";

const W = 440, H = 300;
const PAD = { l: 44, r: 20, t: 16, b: 44 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

interface ChartPt { x: number; y: number; color?: string }

interface Props {
  points: ChartPt[];
  xLabel: string;
  yLabel: string;
  xRange: [number, number];
  yRange: [number, number];
  showRegression?: boolean;
  rValue?: number;
  compact?: boolean;
}

function toSvgX(v: number, min: number, max: number) { return PAD.l + ((v - min) / (max - min)) * IW; }
function toSvgY(v: number, min: number, max: number) { return PAD.t + (1 - (v - min) / (max - min)) * IH; }

function CorrelationChartInner({ points, xLabel, yLabel, xRange, yRange, showRegression = true, rValue, compact }: Props) {
  const [hoverId, setHoverId] = useState<number | null>(null);
  const reg = linearRegression(points);
  const ticks = 5;
  const xTicks = Array.from({ length: ticks }, (_, i) => xRange[0] + (xRange[1] - xRange[0]) * i / (ticks - 1));
  const yTicks = Array.from({ length: ticks }, (_, i) => yRange[0] + (yRange[1] - yRange[0]) * i / (ticks - 1));

  const fmt = (v: number) => Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${compact ? 240 : H}`} className="block"
      role="img" aria-label={`Scatter plot: ${xLabel} vs ${yLabel}`}>
      {/* Grid */}
      {xTicks.map((v, i) => <line key={`gx-${i}`} x1={toSvgX(v, ...xRange)} y1={PAD.t} x2={toSvgX(v, ...xRange)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />)}
      {yTicks.map((v, i) => <line key={`gy-${i}`} x1={PAD.l} y1={toSvgY(v, ...yRange)} x2={PAD.l + IW} y2={toSvgY(v, ...yRange)} stroke="#1e293b" strokeWidth="1" />)}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />

      {/* Ticks */}
      {xTicks.map((v, i) => <text key={`xl-${i}`} x={toSvgX(v, ...xRange)} y={PAD.t + IH + 14} textAnchor="middle" fontSize="8" fill="#475569" fontFamily="Inter,sans-serif">{fmt(v)}</text>)}
      {yTicks.map((v, i) => <text key={`yl-${i}`} x={PAD.l - 5} y={toSvgY(v, ...yRange) + 3} textAnchor="end" fontSize="8" fill="#475569" fontFamily="Inter,sans-serif">{fmt(v)}</text>)}

      {/* Axis labels */}
      <text x={PAD.l + IW / 2} y={W > 300 ? H - 2 : 235} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter,sans-serif">{xLabel}</text>
      <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter,sans-serif" transform={`rotate(-90,12,${PAD.t + IH / 2})`}>{yLabel}</text>

      {/* Regression */}
      {showRegression && points.length > 1 && (
        <line
          x1={toSvgX(xRange[0], ...xRange)} y1={toSvgY(reg.intercept + reg.slope * xRange[0], ...yRange)}
          x2={toSvgX(xRange[1], ...xRange)} y2={toSvgY(reg.intercept + reg.slope * xRange[1], ...yRange)}
          stroke="#d4af37" strokeWidth="2" strokeDasharray="6 3" opacity="0.85"
        />
      )}

      {/* Points */}
      {points.map((pt, i) => {
        const cx = toSvgX(pt.x, ...xRange);
        const cy = toSvgY(pt.y, ...yRange);
        const isHov = hoverId === i;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={isHov ? 7 : 5} fill={pt.color || "#3bb4a4"}
              stroke="rgba(255,255,255,0.2)" strokeWidth="1"
              style={{ cursor: "default", transition: "r 0.15s" }}
              onMouseEnter={() => setHoverId(i)} onMouseLeave={() => setHoverId(null)} />
            {isHov && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={cx - 40} y={cy - 34} width="80" height="22" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <text x={cx} y={cy - 20} textAnchor="middle" fontSize="8" fill="#f1f5f9" fontFamily="Inter,sans-serif">
                  ({fmt(pt.x)}, {fmt(pt.y)})
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* R value */}
      {rValue !== undefined && (
        <text x={PAD.l + IW - 4} y={PAD.t + 14} textAnchor="end" fontSize="10" fontWeight="600" fill="#d4af37" fontFamily="Inter,sans-serif">
          r = {rValue.toFixed(2)}
        </text>
      )}
    </svg>
  );
}

const CorrelationChart = React.memo(CorrelationChartInner);
export default CorrelationChart;
