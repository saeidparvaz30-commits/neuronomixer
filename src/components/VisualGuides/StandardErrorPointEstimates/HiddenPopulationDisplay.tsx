"use client";

import React, { useMemo } from "react";
import { gaussianRandom } from "./types";

interface Props {
  populationMeanRevealed: boolean;
  canReveal: boolean;
  onReveal: () => void;
}

const POP_MEAN = 100;
const POP_SD = 20;
const N_POP = 1000;
const BINS = 20;
const X_MIN = 30;
const X_MAX = 170;

export default function HiddenPopulationDisplay({
  populationMeanRevealed,
  canReveal,
  onReveal,
}: Props) {
  // Pre-generate 1000 population points once
  const popData = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < N_POP; i++) {
      pts.push(gaussianRandom(POP_MEAN, POP_SD));
    }
    return pts;
  }, []);

  // Build histogram bins
  const bins = useMemo(() => {
    const step = (X_MAX - X_MIN) / BINS;
    const counts = new Array(BINS).fill(0);
    popData.forEach((v) => {
      const idx = Math.floor((v - X_MIN) / step);
      const clamped = Math.max(0, Math.min(BINS - 1, idx));
      counts[clamped]++;
    });
    const maxC = Math.max(...counts, 1);
    return counts.map((c, i) => ({
      lo: X_MIN + i * step,
      hi: X_MIN + (i + 1) * step,
      height: c / maxC,
    }));
  }, [popData]);

  // SVG dimensions
  const W = 340;
  const H = 100;
  const PAD_L = 4;
  const PAD_R = 4;
  const PAD_T = 6;
  const PAD_B = 18;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const binW = plotW / BINS;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Population
      </p>
      <p className="text-[12px] text-[#94a3b8] mb-3 leading-relaxed">
        Population of measurements{" "}
        <span className="text-[#3bb4a4] font-semibold">N(μ, 20)</span>
        {" "}(true mean hidden)
      </p>

      {/* Mini histogram */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="overflow-visible"
        aria-label="Population histogram"
      >
        <g transform={`translate(${PAD_L},${PAD_T})`}>
          {bins.map((b, i) => (
            <rect
              key={i}
              x={i * binW}
              y={plotH * (1 - b.height)}
              width={Math.max(binW - 1, 1)}
              height={plotH * b.height}
              fill="#3bb4a4"
              opacity={0.75}
              rx={1}
            />
          ))}
          {/* X axis */}
          <line
            x1={0}
            y1={plotH}
            x2={plotW}
            y2={plotH}
            stroke="#334155"
            strokeWidth={1}
          />
          {/* Tick labels */}
          {[40, 70, 100, 130, 160].map((v) => {
            const xPos = ((v - X_MIN) / (X_MAX - X_MIN)) * plotW;
            return (
              <text
                key={v}
                x={xPos}
                y={plotH + 14}
                fontSize={11}
                fill="#475569"
                textAnchor="middle"
              >
                {v}
              </text>
            );
          })}
          {/* True mean line (revealed) */}
          {populationMeanRevealed && (
            <>
              <line
                x1={((POP_MEAN - X_MIN) / (X_MAX - X_MIN)) * plotW}
                y1={0}
                x2={((POP_MEAN - X_MIN) / (X_MAX - X_MIN)) * plotW}
                y2={plotH}
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                strokeDasharray="3,2"
              />
              <text
                x={((POP_MEAN - X_MIN) / (X_MAX - X_MIN)) * plotW + 3}
                y={12}
                fontSize={11}
                fill="var(--color-accent)"
                fontWeight="bold"
              >
                μ=100
              </text>
            </>
          )}
        </g>
      </svg>

      {/* True mean display */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-[12px] text-[#94a3b8]">
          True mean:{" "}
          {populationMeanRevealed ? (
            <span className="text-[var(--color-accent)] font-bold font-mono">μ = 100</span>
          ) : (
            <span className="text-[#475569] font-mono tracking-widest">••••</span>
          )}
        </div>
        {!populationMeanRevealed && canReveal && (
          <button
            onClick={onReveal}
            className="px-3 py-1 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            Reveal True Mean
          </button>
        )}
      </div>

      {/* Population params */}
      <div className="mt-3 pt-3 border-t border-white/[0.05] flex gap-4 flex-wrap">
        <div className="text-[10px] text-[#475569]">
          Distribution: <span className="text-[#94a3b8]">Normal</span>
        </div>
        <div className="text-[10px] text-[#475569]">
          σ = <span className="text-[#94a3b8]">20</span>
        </div>
        <div className="text-[10px] text-[#475569]">
          N = <span className="text-[#94a3b8]">∞</span>
        </div>
      </div>
    </div>
  );
}
