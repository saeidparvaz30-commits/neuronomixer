"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { tPDF, tCDF, TestType } from "./types";

const W = 520, H = 220, PAD = { l: 28, r: 16, t: 16, b: 32 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;
const T_RANGE = 4;
const N_POINTS = 300;

interface Props {
  df: number;
  tStat: number | null;
  alpha: number;
  testType: TestType;
  hasResult: boolean;
}

export default function DistributionCurve({ df, tStat, alpha, testType, hasResult }: Props) {
  const tx = (t: number) => PAD.l + ((t + T_RANGE) / (2 * T_RANGE)) * IW;

  const { curvePoints, maxY } = useMemo(() => {
    const pts = Array.from({ length: N_POINTS + 1 }, (_, i) => {
      const t = -T_RANGE + (2 * T_RANGE * i / N_POINTS);
      return { t, y: tPDF(t, df) };
    });
    const maxY = Math.max(...pts.map(p => p.y)) * 1.1;
    return { curvePoints: pts, maxY };
  }, [df]);

  const ty = (y: number) => PAD.t + IH - (y / maxY) * IH;

  // Critical value for shading
  const critT = useMemo(() => {
    // Binary search
    let lo = 0, hi = 10;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const p = testType === "two-tailed" ? 2 * (1 - tCDF(mid, df)) : 1 - tCDF(mid, df);
      if (p < alpha) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }, [df, alpha, testType]);

  // Build SVG path for the full curve
  const curvePath = curvePoints.map((p, i) => {
    const x = tx(p.t);
    const y = ty(p.y);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  // Build area-fill path (curve + baseline back)
  const buildAreaPath = (lo: number, hi: number) => {
    const pts = curvePoints.filter(p => p.t >= lo && p.t <= hi);
    if (pts.length < 2) return "";
    const base = ty(0);
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.t).toFixed(1)} ${ty(p.y).toFixed(1)}`).join(" ");
    return `${path} L ${tx(hi).toFixed(1)} ${base} L ${tx(lo).toFixed(1)} ${base} Z`;
  };

  // Regions to shade
  const critRightPath = buildAreaPath(critT, T_RANGE);
  const critLeftPath = testType === "two-tailed" ? buildAreaPath(-T_RANGE, -critT) : "";

  let pValuePath = "";
  if (hasResult && tStat !== null) {
    const abst = Math.abs(tStat);
    pValuePath = buildAreaPath(abst, T_RANGE);
    if (testType === "two-tailed") {
      pValuePath += " " + buildAreaPath(-T_RANGE, -abst);
    }
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block">
        {/* Baseline */}
        <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

        {/* Critical region shading (red) */}
        {critRightPath && <path d={critRightPath} fill="#ef4444" opacity="0.25" />}
        {critLeftPath && <path d={critLeftPath} fill="#ef4444" opacity="0.25" />}

        {/* P-value region shading (gold) */}
        {pValuePath && <path d={pValuePath} fill="#d4af37" opacity="0.35" />}

        {/* Distribution curve */}
        <path d={curvePath} fill="none" stroke="#3bb4a4" strokeWidth="2" />

        {/* Critical value markers */}
        {[critT, ...(testType === "two-tailed" ? [-critT] : [])].map((cv, i) => (
          <g key={i}>
            <line x1={tx(cv)} y1={PAD.t} x2={tx(cv)} y2={PAD.t + IH} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
            <text x={tx(cv)} y={PAD.t + IH + 12} textAnchor="middle" fill="#ef4444" fontSize="8">
              {cv.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Observed t-statistic */}
        {hasResult && tStat !== null && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <line
              x1={tx(tStat)} y1={PAD.t}
              x2={tx(tStat)} y2={PAD.t + IH}
              stroke="#d4af37" strokeWidth="2"
            />
            <text x={tx(tStat) + 3} y={PAD.t + 14} fill="#d4af37" fontSize="9" fontWeight="600">
              t={tStat.toFixed(2)}
            </text>
          </motion.g>
        )}

        {/* X-axis ticks */}
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(v => (
          <text key={v} x={tx(v)} y={PAD.t + IH + 12} textAnchor="middle" fill="#475569" fontSize="8">
            {v}
          </text>
        ))}

        {/* Legend */}
        <g>
          <rect x={W - PAD.r - 100} y={PAD.t + 2} width={8} height={8} fill="#ef4444" opacity="0.5" />
          <text x={W - PAD.r - 89} y={PAD.t + 9} fill="#94a3b8" fontSize="8">Critical region (α)</text>
          <rect x={W - PAD.r - 100} y={PAD.t + 14} width={8} height={8} fill="#d4af37" opacity="0.5" />
          <text x={W - PAD.r - 89} y={PAD.t + 21} fill="#94a3b8" fontSize="8">P-value region</text>
        </g>
      </svg>

      <p className="text-[10px] text-[#475569] mt-1 text-center">
        t-distribution (df = {df}) | α = {alpha} | {testType === "two-tailed" ? "Two-tailed" : "One-tailed"}
      </p>
    </div>
  );
}
