"use client";

import React from "react";
import { motion } from "framer-motion";
import { HistBin, computeStats } from "./types";

const W = 520, H = 260, PAD = { l: 40, r: 16, t: 16, b: 36 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

interface Props {
  bins: HistBin[];
  color: string;
  showMean: boolean;
  showMedian: boolean;
  showStd: boolean;
  data: number[];
}

export default function HistogramChart({ bins, color, showMean, showMedian, showStd, data }: Props) {
  if (bins.length === 0) return null;

  const maxCount = Math.max(...bins.map(b => b.count), 1);
  const allMin = bins[0].lo;
  const allMax = bins[bins.length - 1].hi;
  const range = allMax - allMin || 1;

  const tx = (v: number) => PAD.l + ((v - allMin) / range) * IW;
  const ty = (count: number) => PAD.t + (1 - count / maxCount) * IH;

  const stats = computeStats(data);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: Math.round(t * maxCount),
    y: PAD.t + (1 - t) * IH,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block">
      {/* Grid lines */}
      {yTicks.map(t => (
        <g key={t.val}>
          <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="#1e293b" strokeWidth="1" />
          <text x={PAD.l - 4} y={t.y + 3} textAnchor="end" fill="#475569" fontSize="8">{t.val}</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

      {/* Bars */}
      {bins.map((bin, i) => {
        const x = tx(bin.lo);
        const barW = Math.max(tx(bin.hi) - tx(bin.lo) - 1, 1);
        const barH = (bin.count / maxCount) * IH;
        const y = PAD.t + IH - barH;
        return (
          <motion.rect
            key={i}
            x={x}
            initial={{ height: 0, y: PAD.t + IH }}
            animate={{ height: barH, y }}
            transition={{ type: "spring", stiffness: 200, damping: 25, delay: i * 0.008 }}
            width={barW}
            fill={color}
            opacity="0.75"
            rx="1"
          />
        );
      })}

      {/* Std dev shading */}
      {showStd && (
        <rect
          x={Math.max(tx(stats.mean - stats.std), PAD.l)}
          y={PAD.t}
          width={Math.min(tx(stats.mean + stats.std), W - PAD.r) - Math.max(tx(stats.mean - stats.std), PAD.l)}
          height={IH}
          fill={color}
          opacity="0.08"
        />
      )}

      {/* Mean line */}
      {showMean && stats.mean >= allMin && stats.mean <= allMax && (
        <g>
          <line
            x1={tx(stats.mean)} y1={PAD.t}
            x2={tx(stats.mean)} y2={PAD.t + IH}
            stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2"
          />
          <text x={tx(stats.mean) + 3} y={PAD.t + 10} fill="#3b82f6" fontSize="9" fontWeight="600">
            μ={stats.mean.toFixed(1)}
          </text>
        </g>
      )}

      {/* Median line */}
      {showMedian && stats.median >= allMin && stats.median <= allMax && (
        <g>
          <line
            x1={tx(stats.median)} y1={PAD.t}
            x2={tx(stats.median)} y2={PAD.t + IH}
            stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="4 2"
          />
          <text x={tx(stats.median) + 3} y={PAD.t + 22} fill="#3bb4a4" fontSize="9" fontWeight="600">
            M={stats.median.toFixed(1)}
          </text>
        </g>
      )}

      {/* X-axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const v = allMin + t * range;
        return (
          <text key={t} x={tx(v)} y={PAD.t + IH + 12} textAnchor="middle" fill="#475569" fontSize="8">
            {v.toFixed(0)}
          </text>
        );
      })}
    </svg>
  );
}
