"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { PopDist, POPULATIONS, computeHistogram, computeStats } from "./types";

const W = 400, H = 200, PAD = { l: 32, r: 12, t: 12, b: 32 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;
const N_POP = 2000;

interface Props { dist: PopDist }

export default function PopulationChart({ dist }: Props) {
  const { data, bins, stats } = useMemo(() => {
    const gen = POPULATIONS[dist].generate;
    const data = Array.from({ length: N_POP }, gen);
    const bins = computeHistogram(data, 30);
    const stats = computeStats(data);
    return { data, bins, stats };
  }, [dist]);

  const color = POPULATIONS[dist].color;
  const maxC = Math.max(...bins.map(b => b.count), 1);
  const allMin = bins[0]?.lo ?? 0;
  const allMax = bins[bins.length - 1]?.hi ?? 100;
  const range = allMax - allMin || 1;
  const tx = (v: number) => PAD.l + ((v - allMin) / range) * IW;

  return (
    <div>
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
              initial={{ height: 0, y: PAD.t + IH }}
              animate={{ height: bh, y: PAD.t + IH - bh }}
              transition={{ type: "spring", stiffness: 200, damping: 25, delay: i * 0.005 }}
              width={bw}
              fill={color}
              opacity="0.65"
              rx="0.5"
            />
          );
        })}
        {/* Mean line */}
        <line
          x1={tx(stats.mean)} y1={PAD.t}
          x2={tx(stats.mean)} y2={PAD.t + IH}
          stroke="#d4af37" strokeWidth="1.5" strokeDasharray="3 2"
        />
        <text x={tx(stats.mean) + 3} y={PAD.t + 12} fill="#d4af37" fontSize="8" fontWeight="600">
          μ={stats.mean.toFixed(1)}
        </text>
        {[0, 50, 100].map(v => (
          <text key={v} x={tx(v)} y={PAD.t + IH + 12} textAnchor="middle" fill="#475569" fontSize="8">{v}</text>
        ))}
      </svg>
      <p className="text-[9px] text-[#475569] mt-1">Population: N={N_POP.toLocaleString()} | σ={stats.std.toFixed(1)}</p>
    </div>
  );
}
