"use client";

import React from "react";

const W = 600;
const PAD = { l: 64, r: 20, t: 16, b: 44 };

function toX(i: number, len: number) {
  return PAD.l + (i / (len - 1)) * (W - PAD.l - PAD.r);
}

function toY(v: number, min: number, max: number, H: number) {
  return PAD.t + ((max - v) / (max - min)) * (H - PAD.t - PAD.b);
}

function makePath(vals: number[], min: number, max: number, H: number): string {
  return vals
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i, vals.length)} ${toY(v, min, max, H)}`)
    .join(" ");
}

interface Props {
  values: number[];
  labels: string[];
  color?: string;
  height?: number;
  overlayValues?: number[];
  overlayColor?: string;
  title?: string;
  showZeroLine?: boolean;
}

export default function TimeSeriesPlot({
  values,
  labels,
  color = "#3bb4a4",
  height = 220,
  overlayValues,
  overlayColor = "var(--color-accent)",
  title,
  showZeroLine = false,
}: Props) {
  const H = height;
  const n = values.length;

  if (n < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padded_min = min - range * 0.08;
  const padded_max = max + range * 0.08;

  // X axis: sparser ticks so the larger labels never collide
  const xTickStep = Math.max(1, Math.floor(n / 4));
  const xTicks: number[] = [];
  for (let i = 0; i < n; i += xTickStep) xTicks.push(i);
  if (xTicks[xTicks.length - 1] !== n - 1) xTicks.push(n - 1);

  // Y axis: ~5 ticks
  const yTickCount = 5;
  const rawStep = (padded_max - padded_min) / (yTickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep =
    rawStep / magnitude < 1.5
      ? magnitude
      : rawStep / magnitude < 3.5
      ? 2 * magnitude
      : rawStep / magnitude < 7.5
      ? 5 * magnitude
      : 10 * magnitude;
  const yStart = Math.ceil(padded_min / niceStep) * niceStep;
  const yTicks: number[] = [];
  for (let t = yStart; t <= padded_max + niceStep * 0.01; t += niceStep) {
    yTicks.push(parseFloat(t.toFixed(10)));
  }

  const zeroY = showZeroLine ? toY(0, padded_min, padded_max, H) : null;

  return (
    <div>
      {title && (
        <p className="text-[11px] font-semibold text-[#94a3b8] mb-1 uppercase tracking-wide">
          {title}
        </p>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* Plot background */}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={W - PAD.l - PAD.r}
          height={H - PAD.t - PAD.b}
          fill="#0f172a"
          stroke="#1e293b"
          strokeWidth={1}
        />

        {/* Y grid lines */}
        {yTicks.map((t) => {
          const sy = toY(t, padded_min, padded_max, H);
          if (sy < PAD.t - 1 || sy > PAD.t + (H - PAD.t - PAD.b) + 1) return null;
          return (
            <g key={`y-${t}`}>
              <line
                x1={PAD.l}
                y1={sy}
                x2={W - PAD.r}
                y2={sy}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text
                x={PAD.l - 6}
                y={sy + 6}
                textAnchor="end"
                fill="#475569"
                fontSize={19}
              >
                {Math.abs(t) >= 1000
                  ? (t / 1000).toFixed(1) + "k"
                  : t % 1 === 0
                  ? t.toFixed(0)
                  : t.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {showZeroLine && zeroY !== null && zeroY >= PAD.t && zeroY <= PAD.t + (H - PAD.t - PAD.b) && (
          <line
            x1={PAD.l}
            y1={zeroY}
            x2={W - PAD.r}
            y2={zeroY}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="4,3"
          />
        )}

        {/* X tick labels */}
        {xTicks.map((i) => {
          const sx = toX(i, n);
          return (
            <text
              key={`x-${i}`}
              x={sx}
              y={H - PAD.b + 22}
              textAnchor="middle"
              fill="#475569"
              fontSize={19}
            >
              {labels[i]}
            </text>
          );
        })}

        {/* Axes */}
        <line
          x1={PAD.l}
          y1={PAD.t}
          x2={PAD.l}
          y2={H - PAD.b}
          stroke="#334155"
          strokeWidth={1.5}
        />
        <line
          x1={PAD.l}
          y1={H - PAD.b}
          x2={W - PAD.r}
          y2={H - PAD.b}
          stroke="#334155"
          strokeWidth={1.5}
        />

        {/* Main line */}
        <path
          d={makePath(values, padded_min, padded_max, H)}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Overlay line */}
        {overlayValues && overlayValues.length === n && (
          <path
            d={makePath(overlayValues, padded_min, padded_max, H)}
            fill="none"
            stroke={overlayColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />
        )}
      </svg>
    </div>
  );
}
