"use client";

import React, { useMemo } from "react";
import { computeBins, normalPDF } from "./types";

interface Props {
  data: number[];
  binCount?: number;
  width?: number;
  height?: number;
  barColor?: string;
  showNormalOverlay?: boolean;
  overlayMean?: number;
  overlaySd?: number;
  fixedMin?: number;
  fixedMax?: number;
}

const PAD = { l: 28, r: 8, t: 10, b: 22 };

export default function HistogramChart({
  data,
  binCount = 20,
  width = 380,
  height = 180,
  barColor = "#3bb4a4",
  showNormalOverlay = false,
  overlayMean,
  overlaySd,
  fixedMin,
  fixedMax,
}: Props) {
  const IW = width - PAD.l - PAD.r;
  const IH = height - PAD.t - PAD.b;

  const bins = useMemo(
    () => computeBins(data, binCount, fixedMin, fixedMax),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, binCount, fixedMin, fixedMax]
  );

  const domainMin = bins.length > 0 ? bins[0].lo : (fixedMin ?? 0);
  const domainMax = bins.length > 0 ? bins[bins.length - 1].hi : (fixedMax ?? 100);
  const domainRange = domainMax - domainMin || 1;

  const tx = (v: number) => PAD.l + ((v - domainMin) / domainRange) * IW;

  // Normal overlay path
  const overlayPath = useMemo(() => {
    if (!showNormalOverlay || overlayMean == null || overlaySd == null || overlaySd === 0 || data.length === 0 || bins.length === 0) {
      return "";
    }
    const steps = 80;
    const binWidth = domainRange / binCount;
    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    const points: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const v = domainMin + (i / steps) * domainRange;
      const density = normalPDF(v, overlayMean, overlaySd);
      const scaledCount = density * data.length * binWidth;
      const normalizedH = scaledCount / maxCount;
      const x = PAD.l + ((v - domainMin) / domainRange) * IW;
      const y = PAD.t + IH - normalizedH * IH;
      points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${Math.max(PAD.t, Math.min(PAD.t + IH, y)).toFixed(1)}`);
    }
    return points.join(" ");
  }, [showNormalOverlay, overlayMean, overlaySd, data, bins, domainMin, domainRange, binCount, IH, IW]);

  // X-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    domainMin + (i / tickCount) * domainRange
  );

  if (data.length === 0 || bins.length === 0) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="block">
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#475569" fontSize="12">
          No data yet
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="block">
      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="0.8" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="0.8" />

      {/* Bars */}
      {bins.map((bin, i) => {
        const x = tx(bin.lo);
        const bw = Math.max(tx(bin.hi) - tx(bin.lo) - 0.5, 1);
        const bh = bin.height * IH;
        return (
          <rect
            key={i}
            x={x}
            y={PAD.t + IH - bh}
            width={bw}
            height={bh}
            fill={barColor}
            opacity="0.7"
            rx="0.5"
          >
            <title>{`${bin.lo.toFixed(1)}–${bin.hi.toFixed(1)}: ${bin.count}`}</title>
          </rect>
        );
      })}

      {/* Normal overlay */}
      {overlayPath && (
        <path
          d={overlayPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          strokeLinecap="round"
          style={{ opacity: showNormalOverlay ? 1 : 0, transition: "opacity 0.4s" }}
        />
      )}

      {/* X-axis ticks */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={tx(v)} y1={PAD.t + IH} x2={tx(v)} y2={PAD.t + IH + 3} stroke="#475569" strokeWidth="0.5" />
          <text x={tx(v)} y={PAD.t + IH + 14} textAnchor="middle" fill="#475569" fontSize="12">
            {v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}
          </text>
        </g>
      ))}
    </svg>
  );
}
