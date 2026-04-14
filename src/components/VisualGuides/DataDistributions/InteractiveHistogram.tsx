"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { HistBin } from "./types";

const W = 560;
const H = 280;
const PAD = { l: 44, r: 16, t: 20, b: 40 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

// Distinct color for empirical sample bars — always contrasts with any distribution color
const EMPIRICAL_COLOR = "#f1f5f9";

interface TooltipData {
  x: number;
  y: number;
  binLabel: string;
  height: number;
}

interface Props {
  bins: HistBin[];
  empiricalBins?: HistBin[];
  sampleSize?: number;
  color: string;
  overlayBins?: HistBin[];
  overlayColor?: string;
  distributionName: string;
  showEmpirical: boolean;
}

export default function InteractiveHistogram({
  bins,
  empiricalBins,
  sampleSize,
  color,
  overlayBins,
  overlayColor = "#d4af37",
  distributionName,
  showEmpirical,
}: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (bins.length === 0) return null;

  // Compute x-range across all bin sets
  const allBins = [
    ...bins,
    ...(overlayBins ?? []),
    ...(showEmpirical && empiricalBins ? empiricalBins : []),
  ];
  const xMin = Math.min(...allBins.map(b => b.lo));
  const xMax = Math.max(...allBins.map(b => b.hi));
  const xRange = xMax - xMin || 1;

  function tx(v: number) { return PAD.l + ((v - xMin) / xRange) * IW; }
  function ty(h: number) { return PAD.t + (1 - h) * IH; }

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => xMin + t * xRange);

  function handleMouseEnter(
    e: React.MouseEvent<SVGRectElement>,
    bin: HistBin,
    h: number
  ) {
    const rect = (e.currentTarget as SVGRectElement)
      .closest("svg")!
      .getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      binLabel: bin.label ?? `${bin.lo.toFixed(1)} – ${bin.hi.toFixed(1)}`,
      height: h,
    });
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label={`Histogram of ${distributionName} distribution`}
        role="img"
        className="block"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {yTicks.map(t => (
          <g key={t}>
            <line
              x1={PAD.l} y1={ty(t)}
              x2={W - PAD.r} y2={ty(t)}
              stroke="#1e293b" strokeWidth="1"
            />
            <text
              x={PAD.l - 5} y={ty(t) + 3.5}
              textAnchor="end" fill="#475569" fontSize="8"
            >
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

        {/* Overlay (compare) bars — drawn first so main bars are on top */}
        {overlayBins && overlayBins.map((bin, i) => {
          // Center the bar on its midpoint and enforce a min 5px width
          // so that discrete distributions (Poisson) are always visible
          const binCenter = (bin.lo + bin.hi) / 2;
          const naturalW = tx(bin.hi) - tx(bin.lo);
          const w = Math.max(naturalW, 5);
          const x = tx(binCenter) - w / 2;
          const barH = bin.height * IH;
          return (
            <motion.rect
              key={`overlay-${i}`}
              x={x} width={w}
              initial={{ height: 0, y: PAD.t + IH }}
              animate={{ height: barH, y: ty(bin.height) }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              fill={overlayColor}
              opacity={0.65}
              rx="1"
            />
          );
        })}

        {/* Overlay mean line — dashed vertical at tallest overlay bar */}
        {overlayBins && (() => {
          const peak = overlayBins.reduce((best, b) => b.height > best.height ? b : best, overlayBins[0]);
          const cx = tx((peak.lo + peak.hi) / 2);
          return (
            <line
              x1={cx} y1={PAD.t}
              x2={cx} y2={PAD.t + IH}
              stroke={overlayColor}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={0.4}
            />
          );
        })()}

        {/* Empirical bars — white-ish, clearly distinct from theoretical */}
        {showEmpirical && empiricalBins && empiricalBins.map((bin, i) => {
          const x = tx(bin.lo);
          const w = Math.max(tx(bin.hi) - tx(bin.lo) - 0.5, 1);
          const barH = bin.height * IH;
          return (
            <motion.rect
              key={`emp-${i}`}
              x={x} width={w}
              initial={{ height: 0, y: PAD.t + IH }}
              animate={{ height: barH, y: ty(bin.height) }}
              transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.004 }}
              fill={EMPIRICAL_COLOR}
              opacity={0.35}
              rx="1"
            />
          );
        })}

        {/* Theoretical bars */}
        {bins.map((bin, i) => {
          const x = tx(bin.lo);
          const w = Math.max(tx(bin.hi) - tx(bin.lo) - 0.5, 1);
          const barH = bin.height * IH;
          return (
            <motion.rect
              key={i}
              x={x} width={w}
              initial={{ height: 0, y: PAD.t + IH }}
              animate={{ height: barH, y: ty(bin.height) }}
              transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.004 }}
              fill={color}
              opacity={0.82}
              rx="1"
              style={{ cursor: "pointer" }}
              onMouseEnter={e => handleMouseEnter(e, bin, bin.height)}
              onMouseMove={e => handleMouseEnter(e, bin, bin.height)}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* X-axis labels */}
        {xTicks.map((v, i) => (
          <text
            key={i}
            x={tx(v)} y={PAD.t + IH + 14}
            textAnchor="middle" fill="#475569" fontSize="8"
          >
            {v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}
          </text>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x + 6, W - 120)}
              y={Math.max(tooltip.y - 30, 4)}
              width={108} height={30}
              rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1"
            />
            <text
              x={Math.min(tooltip.x + 12, W - 114)}
              y={Math.max(tooltip.y - 16, 16)}
              fill="#f1f5f9" fontSize="8.5" fontWeight="600"
            >
              {tooltip.binLabel}
            </text>
            <text
              x={Math.min(tooltip.x + 12, W - 114)}
              y={Math.max(tooltip.y - 4, 28)}
              fill="#94a3b8" fontSize="8"
            >
              rel. freq: {(tooltip.height * 100).toFixed(1)}%
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      {(overlayBins || showEmpirical) && (
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: color, opacity: 0.82 }} />
            <span className="text-[10px] text-[#94a3b8]">Theoretical</span>
          </div>
          {showEmpirical && empiricalBins && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: EMPIRICAL_COLOR, opacity: 0.55 }} />
              <span className="text-[10px] text-[#94a3b8]">
                Sample{sampleSize ? ` (n=${sampleSize.toLocaleString()})` : ""}
              </span>
            </div>
          )}
          {overlayBins && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: overlayColor, opacity: 0.65 }} />
              <span className="text-[10px] text-[#94a3b8]">Comparison distribution</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
