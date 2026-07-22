"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  sampleMeans: number[];
  sampleMedians: number[];
  populationMean: number;
  populationMeanRevealed: boolean;
  sampleSize: number;
}

const X_MIN = 60;
const X_MAX = 140;
const X_TICKS = [60, 70, 80, 90, 100, 110, 120, 130, 140];
const DOT_R = 4;
const DOT_SPACING = DOT_R * 2 + 2;
const SVG_W = 600;
const SVG_H = 200;
const PAD_L = 12;
const PAD_R = 12;
const PAD_T = 20;
const PAD_B = 32;
const PLOT_W = SVG_W - PAD_L - PAD_R;
const PLOT_H = SVG_H - PAD_T - PAD_B;

function xToSvg(val: number): number {
  return PAD_L + ((val - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}

// Build dot positions with vertical jitter to avoid overlap
function buildDotPositions(
  means: number[]
): { x: number; y: number; val: number }[] {
  // Bucket dots by pixel x
  const bucketW = DOT_R * 2 + 1;
  const buckets: Record<number, number> = {}; // bucketKey -> count so far

  return means.map((val) => {
    const svgX = xToSvg(val);
    const bucketKey = Math.round(svgX / bucketW);
    const count = buckets[bucketKey] ?? 0;
    buckets[bucketKey] = count + 1;
    // Alternate up/down from center
    const row = Math.floor(count / 2);
    const sign = count % 2 === 0 ? 1 : -1;
    const baseY = PAD_T + PLOT_H / 2;
    const y = baseY + sign * row * DOT_SPACING;
    return { x: svgX, y: Math.max(PAD_T + DOT_R, Math.min(PAD_T + PLOT_H - DOT_R, y)), val };
  });
}

export default function SampleMeanPlotter({
  sampleMeans,
  populationMean,
  populationMeanRevealed,
  sampleSize,
}: Props) {
  const dotPositions = useMemo(
    () => buildDotPositions(sampleMeans),
    [sampleMeans]
  );

  const meanX = xToSvg(populationMean);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      {/* Title row */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-[13px] font-bold text-[#3bb4a4]">
          Sample Means
        </h3>
        <span className="text-[10px] font-mono text-[#475569]">
          n = {sampleSize} &nbsp;|&nbsp; samples = {sampleMeans.length}
        </span>
      </div>
      <p className="text-[11px] text-[#475569] mb-3">
        Sample means cluster around the true population mean
      </p>

      {/* SVG dot plot */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ minWidth: 280 }}
          aria-label="Sample means dot plot"
        >
          {/* Axis background */}
          <rect
            x={PAD_L}
            y={PAD_T}
            width={PLOT_W}
            height={PLOT_H}
            fill="#0a0e1a"
            rx={4}
          />

          {/* Center guide line */}
          <line
            x1={PAD_L}
            y1={PAD_T + PLOT_H / 2}
            x2={PAD_L + PLOT_W}
            y2={PAD_T + PLOT_H / 2}
            stroke="#1e293b"
            strokeWidth={1}
          />

          {/* Population mean line */}
          {populationMeanRevealed && (
            <>
              <line
                x1={meanX}
                y1={PAD_T}
                x2={meanX}
                y2={PAD_T + PLOT_H}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
              <text
                x={meanX + 4}
                y={PAD_T + 16}
                fontSize={19}
                fill="#ef4444"
                fontWeight="bold"
              >
                μ = 100
              </text>
            </>
          )}

          {/* Dots */}
          <AnimatePresence>
            {dotPositions.map((d, i) => (
              <motion.circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={DOT_R}
                fill="#3bb4a4"
                opacity={0.85}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 0.85, scale: 1 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
              />
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {sampleMeans.length === 0 && (
            <text
              x={SVG_W / 2}
              y={PAD_T + PLOT_H / 2 + 4}
              textAnchor="middle"
              fontSize={19}
              fill="#334155"
            >
              Draw samples to see means appear here
            </text>
          )}

          {/* X axis */}
          <line
            x1={PAD_L}
            y1={PAD_T + PLOT_H}
            x2={PAD_L + PLOT_W}
            y2={PAD_T + PLOT_H}
            stroke="#334155"
            strokeWidth={1}
          />

          {/* X tick marks and labels */}
          {X_TICKS.map((v) => {
            const x = xToSvg(v);
            return (
              <g key={v}>
                <line
                  x1={x}
                  y1={PAD_T + PLOT_H}
                  x2={x}
                  y2={PAD_T + PLOT_H + 4}
                  stroke="#334155"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={PAD_T + PLOT_H + 20}
                  fontSize={19}
                  fill="#475569"
                  textAnchor="middle"
                >
                  {v}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {sampleMeans.length >= 5 && (
        <p className="text-[10px] text-[#3bb4a4] mt-2">
          Observed spread (SD of means):{" "}
          <span className="font-mono font-semibold">
            {(
              Math.sqrt(
                sampleMeans.reduce((s, x) => {
                  const m =
                    sampleMeans.reduce((a, b) => a + b, 0) / sampleMeans.length;
                  return s + (x - m) ** 2;
                }, 0) / sampleMeans.length
              )
            ).toFixed(3)}
          </span>
        </p>
      )}
    </div>
  );
}
