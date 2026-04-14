"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ConfidenceInterval, ConfidenceLevel, TRUE_MEAN } from "./types";

interface TooltipState {
  x: number;
  y: number;
  ci: ConfidenceInterval;
}

interface Props {
  intervals: ConfidenceInterval[];
  trueParameter: number;
  confidenceLevel: ConfidenceLevel;
  onIntervalClick: (sampleId: number) => void;
  expandedSampleId: number | null;
}

const SVG_W = 600;
const ROW_H = 12;
const X_AXIS_H = 24;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 20;
const INNER_W = SVG_W - PAD_L - PAD_R;

const X_MIN = 75;
const X_MAX = 125;
const X_TICKS = [80, 85, 90, 95, 100, 105, 110, 115, 120];

function scaleX(v: number): number {
  return PAD_L + ((v - X_MIN) / (X_MAX - X_MIN)) * INNER_W;
}

export default function IntervalVisualization({
  intervals,
  trueParameter,
  confidenceLevel,
  onIntervalClick,
  expandedSampleId,
}: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalH = PAD_T + intervals.length * ROW_H + X_AXIS_H;
  const trueLine = scaleX(trueParameter);

  const coverCount = intervals.filter((i) => i.containsTruth).length;

  const interpretationText = () => {
    const diff = Math.abs(coverCount - confidenceLevel);
    if (diff <= 3)
      return `This is exactly what we expect for ${confidenceLevel}% confidence intervals!`;
    if (coverCount > confidenceLevel) return "Great coverage!";
    return "Slightly lower than expected — just chance variation.";
  };

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGGElement>, ci: ConfidenceInterval) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        ci,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGGElement>, ci: ConfidenceInterval) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        ci,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (intervals.length === 0) {
    return (
      <div className="flex items-center justify-center h-44 rounded-xl border border-dashed border-[#1e293b]">
        <p className="text-[12px] text-[#334155]">
          Click &quot;Generate 100 Samples&quot; to begin
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Title and subtitle */}
      <div>
        <p className="text-[13px] font-bold text-white">
          100 Confidence Intervals from Repeated Sampling
        </p>
        <p className="text-[11px] text-[#94a3b8]">
          <span className="text-[#3bb4a4] font-bold">{coverCount}</span> of 100
          intervals contain the true mean (green) —{" "}
          <span className="text-[#f1f5f9]">{interpretationText()}</span>
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-sm bg-[#3bb4a4]" />
          <span className="text-[#94a3b8]">Captures μ=100</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-sm bg-[#ef4444]" />
          <span className="text-[#94a3b8]">Misses μ=100</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3 bg-[#d4af37]" />
          <span className="text-[#94a3b8]">True mean (μ=100)</span>
        </div>
      </div>

      {/* SVG visualization */}
      <div
        ref={containerRef}
        className="relative overflow-y-auto rounded-xl border border-[#1e293b]"
        style={{ maxHeight: 600 }}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${totalH}`}
          width="100%"
          style={{ minHeight: totalH, display: "block" }}
          aria-label="100 confidence intervals visualization"
        >
          {/* Row labels background */}
          {intervals.map((_, idx) => {
            const y = PAD_T + idx * ROW_H;
            return (
              <rect
                key={`bg-${idx}`}
                x={0}
                y={y}
                width={SVG_W}
                height={ROW_H}
                fill={idx % 10 === 0 ? "#ffffff08" : "transparent"}
              />
            );
          })}

          {/* True mean vertical line */}
          <line
            x1={trueLine}
            y1={PAD_T - 4}
            x2={trueLine}
            y2={PAD_T + intervals.length * ROW_H + 4}
            stroke="#d4af37"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <text
            x={trueLine + 3}
            y={PAD_T - 6}
            fill="#d4af37"
            fontSize="8"
            fontWeight="600"
          >
            μ=100
          </text>

          {/* Interval bars */}
          {intervals.map((ci, idx) => {
            const y = PAD_T + idx * ROW_H;
            const barY = y + 2;
            const barH = ROW_H - 4;
            const x1 = Math.max(PAD_L, scaleX(ci.lower));
            const x2 = Math.min(SVG_W - PAD_R, scaleX(ci.upper));
            const cx = scaleX(ci.mean);
            const color = ci.containsTruth ? "#3bb4a4" : "#ef4444";
            const isSelected = expandedSampleId === ci.sampleId;
            const delay = idx * 0.02;

            return (
              <motion.g
                key={ci.sampleId}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.3, delay }}
                style={{
                  transformOrigin: `${cx}px ${barY + barH / 2}px`,
                  cursor: "pointer",
                }}
                onClick={() => onIntervalClick(ci.sampleId)}
                onMouseEnter={(e) =>
                  handleMouseEnter(
                    e as unknown as React.MouseEvent<SVGGElement>,
                    ci
                  )
                }
                onMouseMove={(e) =>
                  handleMouseMove(
                    e as unknown as React.MouseEvent<SVGGElement>,
                    ci
                  )
                }
                onMouseLeave={handleMouseLeave}
                role="button"
                tabIndex={0}
                aria-label={`Sample ${ci.sampleId}: CI ${ci.lower.toFixed(1)} to ${ci.upper.toFixed(1)}, ${ci.containsTruth ? "contains" : "misses"} true mean`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onIntervalClick(ci.sampleId);
                  }
                }}
              >
                {/* Selection highlight */}
                {isSelected && (
                  <rect
                    x={PAD_L}
                    y={y}
                    width={INNER_W}
                    height={ROW_H}
                    fill="#d4af3712"
                    stroke="#d4af37"
                    strokeWidth="0.5"
                    rx="1"
                  />
                )}
                {/* Interval bar */}
                <rect
                  x={x1}
                  y={barY}
                  width={Math.max(2, x2 - x1)}
                  height={barH}
                  fill={color}
                  opacity={isSelected ? 1 : 0.65}
                  rx="1"
                />
                {/* Sample mean dot */}
                <circle
                  cx={cx}
                  cy={barY + barH / 2}
                  r={2}
                  fill="white"
                  opacity="0.85"
                />
                {/* Row label every 10 */}
                {idx % 10 === 0 && (
                  <text
                    x={PAD_L - 3}
                    y={barY + barH / 2 + 3}
                    textAnchor="end"
                    fill="#334155"
                    fontSize="7"
                  >
                    {ci.sampleId}
                  </text>
                )}
              </motion.g>
            );
          })}

          {/* X-axis line */}
          <line
            x1={PAD_L}
            y1={PAD_T + intervals.length * ROW_H + 2}
            x2={SVG_W - PAD_R}
            y2={PAD_T + intervals.length * ROW_H + 2}
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* X-axis tick marks and labels */}
          {X_TICKS.map((tick) => {
            const tx = scaleX(tick);
            return (
              <g key={tick}>
                <line
                  x1={tx}
                  y1={PAD_T + intervals.length * ROW_H + 2}
                  x2={tx}
                  y2={PAD_T + intervals.length * ROW_H + 6}
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={PAD_T + intervals.length * ROW_H + 16}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="8"
                >
                  {tick}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 rounded-lg border border-[#1e293b] bg-[#0f172a] px-3 py-2 shadow-xl"
            style={{
              left: tooltip.x + 12,
              top: Math.max(0, tooltip.y - 36),
            }}
          >
            <p className="text-[10px] font-bold text-white mb-0.5">
              Sample #{tooltip.ci.sampleId}
            </p>
            <p className="text-[10px] text-[#94a3b8]">
              [{tooltip.ci.lower.toFixed(2)}, {tooltip.ci.upper.toFixed(2)}]
            </p>
            <p
              className="text-[10px] font-semibold"
              style={{
                color: tooltip.ci.containsTruth ? "#3bb4a4" : "#ef4444",
              }}
            >
              {tooltip.ci.containsTruth ? "Contains μ=100" : "Misses μ=100"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
