"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { computeHistogram, computeStats, gaussRand } from "./types";

const W = 400, H = 220, PAD = { l: 32, r: 12, t: 16, b: 32 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

interface Props {
  means: number[];
  color: string;
  sampleSize: number;
  theoreticalMean: number;
  theoreticalStd: number;
}

export default function SamplingDistChart({ means, color, sampleSize, theoreticalMean, theoreticalStd }: Props) {
  const { bins, stats } = useMemo(() => {
    const bins = computeHistogram(means, Math.max(10, Math.min(30, Math.floor(means.length / 5))));
    const stats = computeStats(means);
    return { bins, stats };
  }, [means]);

  // Normal curve overlay
  const normalCurve = useMemo(() => {
    if (means.length < 10 || !bins.length) return [];
    const allMin = bins[0].lo, allMax = bins[bins.length - 1].hi;
    const range = allMax - allMin || 1;
    const maxC = Math.max(...bins.map(b => b.count), 1);
    const se = theoreticalStd / Math.sqrt(sampleSize);
    const points: { x: number; y: number }[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const v = allMin + (i / steps) * range;
      const z = (v - theoreticalMean) / se;
      const density = Math.exp(-0.5 * z * z) / (se * Math.sqrt(2 * Math.PI));
      const binWidth = (allMax - allMin) / bins.length;
      const scaledY = density * means.length * binWidth;
      const x = PAD.l + ((v - allMin) / range) * IW;
      const y = PAD.t + IH - (scaledY / maxC) * IH;
      points.push({ x, y: Math.max(PAD.t, Math.min(PAD.t + IH, y)) });
    }
    return points;
  }, [means, bins, theoreticalMean, theoreticalStd, sampleSize]);

  if (!bins.length) {
    return (
      <div className="flex items-center justify-center h-[220px]">
        <p className="text-[12px] text-[#475569]">Click "Draw Sample" to start →</p>
      </div>
    );
  }

  const maxC = Math.max(...bins.map(b => b.count), 1);
  const allMin = bins[0].lo, allMax = bins[bins.length - 1].hi;
  const range = allMax - allMin || 1;
  const tx = (v: number) => PAD.l + ((v - allMin) / range) * IW;

  const pathD = normalCurve.length > 0
    ? `M ${normalCurve[0].x} ${normalCurve[0].y} ` +
      normalCurve.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block">
      <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

      {bins.map((bin, i) => {
        const x = tx(bin.lo);
        const bw = Math.max(tx(bin.hi) - tx(bin.lo) - 0.5, 1);
        const bh = (bin.count / maxC) * IH;
        return (
          <motion.rect
            key={i}
            x={x}
            animate={{ height: bh, y: PAD.t + IH - bh }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            width={bw}
            fill={color}
            opacity="0.6"
            rx="0.5"
          />
        );
      })}

      {/* Normal curve overlay */}
      {pathD && means.length >= 20 && (
        <motion.path
          d={pathD}
          fill="none"
          stroke="#d4af37"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Mean line */}
      {stats.mean >= allMin && stats.mean <= allMax && (
        <g>
          <line
            x1={tx(stats.mean)} y1={PAD.t}
            x2={tx(stats.mean)} y2={PAD.t + IH}
            stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="3 2"
          />
          <text x={tx(stats.mean) + 3} y={PAD.t + 12} fill="#3bb4a4" fontSize="8" fontWeight="600">
            x̄={stats.mean.toFixed(1)}
          </text>
        </g>
      )}

      {[allMin, (allMin + allMax) / 2, allMax].map(v => (
        <text key={v} x={tx(v)} y={PAD.t + IH + 12} textAnchor="middle" fill="#475569" fontSize="8">
          {v.toFixed(1)}
        </text>
      ))}
    </svg>
  );
}
