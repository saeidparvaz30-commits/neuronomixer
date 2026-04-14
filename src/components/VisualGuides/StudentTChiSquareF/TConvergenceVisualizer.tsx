"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  tPDF,
  normalPDF,
  generatePoints,
  pointsToSVGPath,
} from "./types";

const SUBPLOT_W = 160;
const SUBPLOT_H = 100;

const DF_VALUES = [1, 2, 3, 5, 10, 20, 50] as const;

interface SubplotProps {
  df: number;
  index: number;
}

function SubplotPanel({ df, index }: SubplotProps) {
  const tColor = "#3bb4a4";
  const normalColor = "#475569";

  const { tPath, normalPath } = useMemo(() => {
    const xMin = -5;
    const xMax = 5;
    const tPts = generatePoints((x) => tPDF(x, df), xMin, xMax, 200);
    const normPts = generatePoints(normalPDF, xMin, xMax, 200);
    const yMax =
      Math.max(...tPts.map(([, y]) => y), ...normPts.map(([, y]) => y)) * 1.1;
    return {
      tPath: pointsToSVGPath(tPts, SUBPLOT_W, SUBPLOT_H, xMin, xMax, yMax),
      normalPath: pointsToSVGPath(normPts, SUBPLOT_W, SUBPLOT_H, xMin, xMax, yMax),
    };
  }, [df]);

  // How close is this t-curve to normal? (rough heuristic: df/(df+1))
  const similarity = df / (df + 1);
  const similarityPct = Math.round(similarity * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="flex flex-col items-center gap-1.5"
    >
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-2 relative overflow-hidden">
        {/* Similarity badge */}
        <div
          className="absolute top-1.5 right-1.5 text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: tColor + "22",
            color: tColor,
            border: `1px solid ${tColor}44`,
          }}
        >
          {similarityPct}%
        </div>

        <svg
          viewBox={`0 0 ${SUBPLOT_W} ${SUBPLOT_H}`}
          width={SUBPLOT_W}
          height={SUBPLOT_H}
          aria-label={`t-distribution convergence at df=${df}`}
        >
          {/* Baseline */}
          <line
            x1={0}
            y1={SUBPLOT_H - 8}
            x2={SUBPLOT_W}
            y2={SUBPLOT_H - 8}
            stroke="#1e293b"
            strokeWidth={0.8}
          />
          {/* Center line */}
          <line
            x1={SUBPLOT_W / 2}
            y1={0}
            x2={SUBPLOT_W / 2}
            y2={SUBPLOT_H - 8}
            stroke="#1e293b"
            strokeWidth={0.6}
            strokeDasharray="3 3"
          />

          {/* Normal dashed */}
          <path
            d={normalPath}
            fill="none"
            stroke={normalColor}
            strokeWidth={1.2}
            strokeDasharray="4 3"
            opacity={0.5}
          />

          {/* t curve */}
          <path d={tPath} fill="none" stroke={tColor} strokeWidth={1.8} />
        </svg>
      </div>

      <span className="text-[10px] font-mono text-[#94a3b8]">df = {df}</span>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TConvergenceVisualizerProps {
  visible: boolean;
  onToggle: () => void;
}

export default function TConvergenceVisualizer({
  visible,
  onToggle,
}: TConvergenceVisualizerProps) {
  return (
    <section className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-white">
            t → Normal as df Increases
          </h2>
          <p className="text-[11px] text-[#94a3b8] mt-0.5">
            Each panel shows t (solid teal) vs standard normal (dashed gray).
            The similarity badge shows how close they are.
          </p>
        </div>

        <button
          onClick={onToggle}
          className="px-4 py-2 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#3bb4a4] hover:text-[#3bb4a4] transition-colors flex-shrink-0"
        >
          {visible ? "Hide Convergence" : "Show Convergence"}
        </button>
      </div>

      {/* Subplots grid */}
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35 }}
          className="overflow-hidden"
        >
          <div className="mt-5 flex flex-wrap gap-4 justify-center sm:justify-start">
            {DF_VALUES.map((df, i) => (
              <SubplotPanel key={df} df={df} index={i} />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 pl-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-[#3bb4a4] rounded" />
              <span className="text-[10px] text-[#94a3b8]">t-distribution</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width={24} height={4}>
                <line
                  x1={0}
                  y1={2}
                  x2={24}
                  y2={2}
                  stroke="#475569"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              </svg>
              <span className="text-[10px] text-[#94a3b8]">Normal(0,1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "#3bb4a422",
                  color: "#3bb4a4",
                  border: "1px solid #3bb4a444",
                }}
              >
                N%
              </span>
              <span className="text-[10px] text-[#94a3b8]">similarity to normal</span>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
