"use client";

import React from "react";
import { motion } from "framer-motion";
import { TestResult } from "./types";

interface FalseDiscoveryVisualizationProps {
  testResults: TestResult[];
  numberOfTests: number;
}

export default function FalseDiscoveryVisualization({
  testResults,
  numberOfTests,
}: FalseDiscoveryVisualizationProps) {
  if (testResults.length === 0) return null;

  // ── P-value histogram ────────────────────────────────────────────────────────
  const NUM_BINS = 20;
  const bins: number[] = Array(NUM_BINS).fill(0);
  testResults.forEach(r => {
    const binIndex = Math.min(Math.floor(r.pValue * NUM_BINS), NUM_BINS - 1);
    bins[binIndex]++;
  });
  const maxBinCount = Math.max(...bins, 1);
  const sigCount = testResults.filter(r => r.significant).length;

  const HIST_W = 500;
  const HIST_H = 120;
  const HIST_PAD = { l: 32, r: 8, t: 10, b: 24 };
  const histIW = HIST_W - HIST_PAD.l - HIST_PAD.r;
  const histIH = HIST_H - HIST_PAD.t - HIST_PAD.b;

  // ── Manhattan-style plot ─────────────────────────────────────────────────────
  const MAN_W = 500;
  const MAN_H = 120;
  const MAN_PAD = { l: 40, r: 10, t: 10, b: 24 };
  const manIW = MAN_W - MAN_PAD.l - MAN_PAD.r;
  const manIH = MAN_H - MAN_PAD.t - MAN_PAD.b;

  const logPValues = testResults.map(r => -Math.log10(Math.max(r.pValue, 1e-10)));
  const threshold = -Math.log10(0.05); // ~1.301
  const maxLogP = Math.max(...logPValues, threshold + 0.5);

  function manX(testNum: number) {
    return MAN_PAD.l + ((testNum - 1) / Math.max(numberOfTests - 1, 1)) * manIW;
  }
  function manY(logP: number) {
    return MAN_PAD.t + manIH - (logP / maxLogP) * manIH;
  }

  const thresholdY = manY(threshold);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Visualizations
      </p>

      {/* P-value histogram */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-white font-semibold">P-Value Distribution</p>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#d4af37]/20 text-[#d4af37]">
            {sigCount} tests fall below α = 0.05
          </span>
        </div>
        <svg viewBox={`0 0 ${HIST_W} ${HIST_H}`} width="100%" className="overflow-visible">
          {/* Axes */}
          <line
            x1={HIST_PAD.l} y1={HIST_PAD.t + histIH}
            x2={HIST_PAD.l + histIW} y2={HIST_PAD.t + histIH}
            stroke="#334155" strokeWidth="1"
          />
          <line
            x1={HIST_PAD.l} y1={HIST_PAD.t}
            x2={HIST_PAD.l} y2={HIST_PAD.t + histIH}
            stroke="#334155" strokeWidth="1"
          />

          {/* Bars */}
          {bins.map((count, i) => {
            const bw = histIW / NUM_BINS - 1;
            const bh = (count / maxBinCount) * histIH;
            const bx = HIST_PAD.l + (i / NUM_BINS) * histIW;
            const isFirstBin = i === 0; // 0–0.05 range (first 1/20 of [0,1])
            return (
              <motion.rect
                key={i}
                x={bx}
                width={bw}
                initial={{ height: 0, y: HIST_PAD.t + histIH }}
                animate={{ height: bh, y: HIST_PAD.t + histIH - bh }}
                transition={{ duration: 0.4, delay: i * 0.015 }}
                fill={isFirstBin ? "#d4af37" : "#334155"}
                opacity="0.9"
                rx="1"
              />
            );
          })}

          {/* X-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map(t => (
            <text
              key={t}
              x={HIST_PAD.l + t * histIW}
              y={HIST_PAD.t + histIH + 12}
              textAnchor="middle"
              fill="#475569"
              fontSize="8"
            >
              {t.toFixed(2)}
            </text>
          ))}

          {/* Axis label */}
          <text
            x={HIST_PAD.l + histIW / 2}
            y={HIST_H - 2}
            textAnchor="middle"
            fill="#475569"
            fontSize="8"
          >
            p-value
          </text>

          {/* Alpha cutoff label */}
          <text
            x={HIST_PAD.l + 0.05 * histIW + 2}
            y={HIST_PAD.t + 8}
            fill="#d4af37"
            fontSize="7"
          >
            α=0.05
          </text>
        </svg>
      </div>

      {/* Manhattan-style plot */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-white font-semibold">
            Manhattan Plot (−log₁₀ p-value)
          </p>
          <span className="text-[11px] text-[#475569]">
            Dots above red line = p &lt; 0.05
          </span>
        </div>
        <svg viewBox={`0 0 ${MAN_W} ${MAN_H}`} width="100%" className="overflow-visible">
          {/* Axes */}
          <line
            x1={MAN_PAD.l} y1={MAN_PAD.t + manIH}
            x2={MAN_PAD.l + manIW} y2={MAN_PAD.t + manIH}
            stroke="#334155" strokeWidth="1"
          />
          <line
            x1={MAN_PAD.l} y1={MAN_PAD.t}
            x2={MAN_PAD.l} y2={MAN_PAD.t + manIH}
            stroke="#334155" strokeWidth="1"
          />

          {/* Threshold line at -log10(0.05) */}
          <line
            x1={MAN_PAD.l} y1={thresholdY}
            x2={MAN_PAD.l + manIW} y2={thresholdY}
            stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3"
          />
          <text x={MAN_PAD.l + manIW - 2} y={thresholdY - 3} textAnchor="end" fill="#ef4444" fontSize="7">
            α=0.05
          </text>

          {/* Y-axis labels */}
          {[0, 1, 2, Math.ceil(maxLogP)].map(v => (
            <text
              key={v}
              x={MAN_PAD.l - 3}
              y={manY(v) + 3}
              textAnchor="end"
              fill="#475569"
              fontSize="7"
            >
              {v}
            </text>
          ))}

          {/* Dots */}
          {testResults.map((r, i) => {
            const logP = -Math.log10(Math.max(r.pValue, 1e-10));
            const cx = manX(r.testNumber);
            const cy = manY(logP);
            return (
              <motion.circle
                key={r.testName}
                cx={cx}
                cy={cy}
                r="4"
                initial={{ opacity: 0, cy: MAN_PAD.t + manIH }}
                animate={{ opacity: 1, cy }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                fill={r.significant ? "#d4af37" : "#3b5168"}
                stroke={r.significant ? "#d4af37" : "#334155"}
                strokeWidth="1"
              />
            );
          })}

          {/* X-axis label */}
          <text
            x={MAN_PAD.l + manIW / 2}
            y={MAN_H - 2}
            textAnchor="middle"
            fill="#475569"
            fontSize="8"
          >
            Test Number
          </text>

          {/* Y-axis label */}
          <text
            x={8}
            y={MAN_PAD.t + manIH / 2}
            textAnchor="middle"
            fill="#475569"
            fontSize="8"
            transform={`rotate(-90, 8, ${MAN_PAD.t + manIH / 2})`}
          >
            −log₁₀(p)
          </text>
        </svg>
      </div>
    </div>
  );
}
