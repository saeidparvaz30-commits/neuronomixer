"use client";

import React from "react";
import {
  GradientStatus,
  VANISH_THRESHOLD,
  EXPLODE_THRESHOLD,
  formatMagnitude,
} from "./types";

interface Props {
  /** |dL/dw_i| per layer, index 0 = layer 1 (input side). */
  gradientMags: number[];
  status: GradientStatus;
}

const W = 720;
const H = 348;
const M = { top: 48, right: 16, bottom: 80, left: 100 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

/** Display floor so log bars stay drawable even for tiny magnitudes. */
const LOG_FLOOR = -30;

function GradientBarChartInner({ gradientMags, status }: Props) {
  const n = gradientMags.length;
  const logs = gradientMags.map((m) =>
    Math.max(LOG_FLOOR, Math.log10(Math.max(m, Number.MIN_VALUE)))
  );

  const lo = Math.min(-8, Math.floor(Math.min(...logs)) - 1);
  const hi = Math.max(4, Math.ceil(Math.max(...logs)) + 1);

  const y = (v: number) => M.top + ((hi - v) / (hi - lo)) * PLOT_H;
  const slotW = PLOT_W / n;
  const barW = Math.max(2, slotW * 0.68);
  const x = (i: number) => M.left + i * slotW + (slotW - barW) / 2;

  // Integer-exponent ticks
  const tickStep = Math.max(1, Math.ceil((hi - lo) / 6));
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / tickStep) * tickStep; t <= hi; t += tickStep) {
    ticks.push(t);
  }

  // X labels: 1, multiples of 5 (10 for deep nets), and L
  const xLabelEvery = n <= 12 ? 1 : n <= 24 ? 5 : 10;
  const xLabels: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (i === 1 || i === n || i % xLabelEvery === 0) xLabels.push(i);
  }

  const vanishLog = Math.log10(VANISH_THRESHOLD); // -6
  const explodeLog = Math.log10(EXPLODE_THRESHOLD); // 3

  const summary =
    `Log scale bar chart of gradient magnitude per layer for a ${n} layer network. ` +
    `Layer 1 is the input side, layer ${n} is the output side next to the loss. ` +
    `Gradient at layer 1 is ${formatMagnitude(gradientMags[0])}, ` +
    `gradient at layer ${n} is ${formatMagnitude(gradientMags[n - 1])}. ` +
    `Overall status: ${status}.`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={summary}
    >
      {/* Healthy band between the two thresholds */}
      <rect
        x={M.left}
        y={y(explodeLog)}
        width={PLOT_W}
        height={y(vanishLog) - y(explodeLog)}
        fill="var(--color-success)"
        opacity={0.05}
      />

      {/* Gridlines + y tick labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={M.left}
            x2={M.left + PLOT_W}
            y1={y(t)}
            y2={y(t)}
            stroke="#1e293b"
            strokeWidth={1}
          />
          <text
            x={M.left - 8}
            y={y(t) + 7}
            textAnchor="end"
            fontSize={22}
            fill="#475569"
            fontFamily="monospace"
          >
            1e{t}
          </text>
        </g>
      ))}

      {/* Threshold lines */}
      <line
        x1={M.left}
        x2={M.left + PLOT_W}
        y1={y(vanishLog)}
        y2={y(vanishLog)}
        stroke="var(--color-warning)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text
        x={M.left + PLOT_W - 4}
        y={y(vanishLog) + 24}
        textAnchor="end"
        fontSize={22}
        fill="var(--color-warning)"
      >
        1e-6 vanishing floor
      </text>
      <line
        x1={M.left}
        x2={M.left + PLOT_W}
        y1={y(explodeLog)}
        y2={y(explodeLog)}
        stroke="var(--color-warning)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text
        x={M.left + PLOT_W - 4}
        y={y(explodeLog) - 7}
        textAnchor="end"
        fontSize={22}
        fill="var(--color-warning)"
      >
        1e3 exploding ceiling
      </text>

      {/* Backprop direction annotation (loss is on the RIGHT, flow goes LEFT) */}
      <g>
        <line
          x1={M.left + PLOT_W - 10}
          x2={M.left + 10}
          y1={M.top - 16}
          y2={M.top - 16}
          stroke="#94a3b8"
          strokeWidth={1}
        />
        <path
          d={`M ${M.left + 18} ${M.top - 20} L ${M.left + 10} ${M.top - 16} L ${M.left + 18} ${M.top - 12} Z`}
          fill="#94a3b8"
        />
        <text
          x={M.left + PLOT_W / 2}
          y={M.top - 24}
          textAnchor="middle"
          fontSize={22}
          fill="#94a3b8"
        >
          backprop multiplies from the loss toward layer 1
        </text>
      </g>

      {/* Bars */}
      {logs.map((lv, i) => {
        const inBand = lv >= vanishLog && lv <= explodeLog;
        const barColor = inBand ? "var(--color-success)" : "var(--color-warning)";
        const top = y(lv);
        const bottom = y(lo);
        return (
          <rect
            key={i}
            x={x(i)}
            y={Math.min(top, bottom)}
            width={barW}
            height={Math.max(1.5, Math.abs(bottom - top))}
            rx={1.5}
            fill={barColor}
            opacity={0.85}
          />
        );
      })}

      {/* X tick labels */}
      {xLabels.map((li) => (
        <text
          key={li}
          x={x(li - 1) + barW / 2}
          y={M.top + PLOT_H + 24}
          textAnchor="middle"
          fontSize={22}
          fill="#475569"
          fontFamily="monospace"
        >
          {li}
        </text>
      ))}

      {/* Axis captions: layer direction is explicit */}
      <text
        x={M.left}
        y={H - 34}
        textAnchor="start"
        fontSize={22}
        fill="#94a3b8"
      >
        Layer 1 = input side
      </text>
      <text
        x={M.left + PLOT_W}
        y={H - 6}
        textAnchor="end"
        fontSize={22}
        fill="#94a3b8"
      >
        Layer {n} = output side (next to the loss)
      </text>

      {/* Y axis title */}
      <text
        x={16}
        y={M.top + PLOT_H / 2}
        textAnchor="middle"
        fontSize={22}
        fill="#94a3b8"
        transform={`rotate(-90 16 ${M.top + PLOT_H / 2})`}
      >
        |dL/dw| (log scale)
      </text>
    </svg>
  );
}

const GradientBarChart = React.memo(GradientBarChartInner);
export default GradientBarChart;
