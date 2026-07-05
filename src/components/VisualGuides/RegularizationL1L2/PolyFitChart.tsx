"use client";

import React from "react";
import type { DataPoint } from "./types";

interface CurvePoint {
  x: number;
  y: number;
}

interface Props {
  points: DataPoint[];
  fittedCurve: CurvePoint[];
  trueCurve: CurvePoint[];
  color: string;
  summary: string;
}

const W = 560;
const H = 320;
const PAD = { l: 38, r: 12, t: 14, b: 30 };
const X_MIN = -1.06;
const X_MAX = 1.06;
const Y_MIN = -2.2;
const Y_MAX = 2.2;

function sx(x: number): number {
  return PAD.l + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.l - PAD.r);
}

function sy(y: number): number {
  return PAD.t + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD.t - PAD.b);
}

function toPath(curve: CurvePoint[]): string {
  return curve
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");
}

function PolyFitChartInner({ points, fittedCurve, trueCurve, color, summary }: Props) {
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={summary}
      >
        <defs>
          <clipPath id="regfit-clip">
            <rect
              x={PAD.l}
              y={PAD.t}
              width={W - PAD.l - PAD.r}
              height={H - PAD.t - PAD.b}
            />
          </clipPath>
        </defs>

        {/* Gridlines */}
        {[-2, -1, 0, 1, 2].map((v) => (
          <g key={`gy-${v}`}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={sy(v)}
              y2={sy(v)}
              stroke="#1e293b"
              strokeWidth={v === 0 ? 1.5 : 1}
            />
            <text
              x={PAD.l - 6}
              y={sy(v) + 3}
              textAnchor="end"
              fontSize={10}
              fill="#475569"
            >
              {v}
            </text>
          </g>
        ))}
        {[-1, -0.5, 0, 0.5, 1].map((v) => (
          <g key={`gx-${v}`}>
            <line
              x1={sx(v)}
              x2={sx(v)}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={sx(v)}
              y={H - PAD.b + 14}
              textAnchor="middle"
              fontSize={10}
              fill="#475569"
            >
              {v}
            </text>
          </g>
        ))}
        <text
          x={W - PAD.r}
          y={H - 4}
          textAnchor="end"
          fontSize={10}
          fill="#475569"
        >
          x
        </text>

        <g clipPath="url(#regfit-clip)">
          {/* True function (dashed) */}
          <path
            d={toPath(trueCurve)}
            fill="none"
            stroke="#475569"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          {/* Fitted polynomial */}
          <path
            d={toPath(fittedCurve)}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </g>

        {/* Data points: train = circles, holdout = diamonds */}
        {points.map((p, i) =>
          p.split === "train" ? (
            <circle
              key={i}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={4}
              fill="#94a3b8"
              stroke="#0f172a"
              strokeWidth={1}
            />
          ) : (
            <rect
              key={i}
              x={-4.2}
              y={-4.2}
              width={8.4}
              height={8.4}
              transform={`translate(${sx(p.x)}, ${sy(p.y)}) rotate(45)`}
              style={{ fill: "var(--color-warning)" }}
              stroke="#0f172a"
              strokeWidth={1}
            />
          )
        )}
      </svg>

      {/* Legend (shape + text, color never the only cue) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[11px] text-[#94a3b8]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8] inline-block" />
          Train points ({points.filter((p) => p.split === "train").length})
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rotate-45 inline-block"
            style={{ background: "var(--color-warning)" }}
          />
          Holdout points ({points.filter((p) => p.split === "holdout").length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block" style={{ background: color }} />
          Degree-8 fit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 border-t border-dashed border-[#475569] inline-block" />
          True function sin(2.5x)
        </span>
      </div>
      <p className="mt-1 text-[10px] text-[#475569]">
        The fitted curve is clipped to the plot range; at low λ it can swing far
        outside it between points.
      </p>
    </div>
  );
}

const PolyFitChart = React.memo(PolyFitChartInner);
export default PolyFitChart;
