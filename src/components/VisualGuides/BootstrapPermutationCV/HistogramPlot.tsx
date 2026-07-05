"use client";

import React from "react";

interface VerticalLine {
  x: number;
  color: string;
  label: string;
}

interface ShadedRange {
  lo: number;
  hi: number;
  color: string;
}

interface HistogramPlotProps {
  values: number[];
  color: string;
  verticalLines?: VerticalLine[];
  width?: number;
  height?: number;
  shadedRange?: ShadedRange;
  shadedRanges?: ShadedRange[];
  title?: string;
}

export default function HistogramPlot({
  values,
  color,
  verticalLines = [],
  width = 560,
  height = 260,
  shadedRange,
  shadedRanges,
  title,
}: HistogramPlotProps) {
  const PAD = { l: 48, r: 20, t: title ? 32 : 16, b: 40 };

  if (values.length === 0) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <text
          x={width / 2}
          y={height / 2}
          fill="#475569"
          fontSize="12"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          No data yet
        </text>
      </svg>
    );
  }

  const numBins = 24;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const binWidth = range / numBins;

  // Build bins
  const bins = Array.from({ length: numBins }, (_, i) => {
    const lo = minVal + i * binWidth;
    const hi = lo + binWidth;
    const count = values.filter((v) => {
      if (i === numBins - 1) return v >= lo && v <= hi;
      return v >= lo && v < hi;
    }).length;
    return { lo, hi, count };
  });

  const maxCount = Math.max(...bins.map((b) => b.count), 1);

  const chartW = width - PAD.l - PAD.r;
  const chartH = height - PAD.t - PAD.b;

  function xScale(v: number) {
    return PAD.l + ((v - minVal) / range) * chartW;
  }
  function yScale(count: number) {
    return PAD.t + chartH - (count / maxCount) * chartH;
  }

  // X-axis ticks
  const numTicks = 5;
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) => minVal + (i / numTicks) * range);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Title */}
      {title && (
        <text x={width / 2} y={14} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">
          {title}
        </text>
      )}

      {/* Background grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => {
        const y = PAD.t + chartH - frac * chartH;
        return (
          <line
            key={frac}
            x1={PAD.l}
            y1={y}
            x2={width - PAD.r}
            y2={y}
            stroke="#1e293b"
            strokeWidth="1"
          />
        );
      })}

      {/* Shaded ranges */}
      {[...(shadedRange ? [shadedRange] : []), ...(shadedRanges ?? [])].map((sr, i) => {
        const x0 = Math.max(PAD.l, xScale(sr.lo));
        const x1 = Math.min(xScale(sr.hi), width - PAD.r);
        if (x1 <= x0) return null;
        return (
          <rect
            key={`sr-${i}`}
            x={x0}
            y={PAD.t}
            width={x1 - x0}
            height={chartH}
            fill={sr.color}
            opacity={0.15}
          />
        );
      })}

      {/* Bars */}
      {bins.map((bin, i) => {
        const bx = xScale(bin.lo);
        const bw = Math.max(1, xScale(bin.hi) - xScale(bin.lo) - 1);
        const by = yScale(bin.count);
        const bh = chartH - (by - PAD.t);
        return (
          <rect
            key={i}
            x={bx}
            y={by}
            width={bw}
            height={bh}
            fill={color}
            opacity={0.75}
            rx="1"
          />
        );
      })}

      {/* Vertical lines */}
      {verticalLines.map((vl) => {
        const vx = xScale(vl.x);
        if (vx < PAD.l || vx > width - PAD.r) return null;
        return (
          <g key={vl.label}>
            <line
              x1={vx}
              y1={PAD.t}
              x2={vx}
              y2={PAD.t + chartH}
              stroke={vl.color}
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <text
              x={vx}
              y={PAD.t - 4}
              fill={vl.color}
              fontSize="9"
              textAnchor="middle"
              fontWeight="600"
            >
              {vl.label}
            </text>
          </g>
        );
      })}

      {/* X axis */}
      <line
        x1={PAD.l}
        y1={PAD.t + chartH}
        x2={width - PAD.r}
        y2={PAD.t + chartH}
        stroke="#334155"
        strokeWidth="1"
      />
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={xScale(t)}
            y1={PAD.t + chartH}
            x2={xScale(t)}
            y2={PAD.t + chartH + 4}
            stroke="#334155"
            strokeWidth="1"
          />
          <text
            x={xScale(t)}
            y={PAD.t + chartH + 14}
            fill="#64748b"
            fontSize="9"
            textAnchor="middle"
          >
            {t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Y axis */}
      <line
        x1={PAD.l}
        y1={PAD.t}
        x2={PAD.l}
        y2={PAD.t + chartH}
        stroke="#334155"
        strokeWidth="1"
      />
      <text
        x={14}
        y={PAD.t + chartH / 2}
        fill="#64748b"
        fontSize="9"
        textAnchor="middle"
        transform={`rotate(-90, 14, ${PAD.t + chartH / 2})`}
      >
        Count
      </text>
    </svg>
  );
}
