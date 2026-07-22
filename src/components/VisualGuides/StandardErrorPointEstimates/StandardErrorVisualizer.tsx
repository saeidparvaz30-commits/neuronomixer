"use client";

import React, { useMemo } from "react";
import { computeSE, computeSD } from "./types";

interface Props {
  sampleMeans: number[];
  sampleSize: number;
  populationSD: number;
  populationMean: number;
}

const MINI_W = 220;
const MINI_H = 80;
const PAD = { l: 8, r: 8, t: 10, b: 20 };
const PLOT_W = MINI_W - PAD.l - PAD.r;
const PLOT_H = MINI_H - PAD.t - PAD.b;
const X_MIN = 60;
const X_MAX = 140;

function xPos(val: number): number {
  return PAD.l + ((val - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}

interface MiniDotPlotProps {
  means: number[];
  se: number;
  label: string;
  showBand: boolean;
  populationMean: number;
}

function MiniDotPlot({
  means,
  se,
  label,
  showBand,
  populationMean,
}: MiniDotPlotProps) {
  const DOT_R = 2.5;
  const SPACING = DOT_R * 2 + 1.5;
  const buckets: Record<number, number> = {};

  const dots = means.map((v) => {
    const sx = xPos(v);
    const bk = Math.round(sx / (DOT_R * 2 + 1));
    const cnt = buckets[bk] ?? 0;
    buckets[bk] = cnt + 1;
    const row = Math.floor(cnt / 2);
    const sign = cnt % 2 === 0 ? 1 : -1;
    const baseY = PAD.t + PLOT_H / 2;
    const y = Math.max(
      PAD.t + DOT_R,
      Math.min(PAD.t + PLOT_H - DOT_R, baseY + sign * row * SPACING)
    );
    return { x: sx, y, v };
  });

  const muX = xPos(populationMean);
  const seLeft = xPos(populationMean - se);
  const seRight = xPos(populationMean + se);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${MINI_W} ${MINI_H}`}
        width="100%"
        style={{ maxWidth: MINI_W }}
        aria-label={label}
      >
        <rect
          x={PAD.l}
          y={PAD.t}
          width={PLOT_W}
          height={PLOT_H}
          fill="#0a0e1a"
          rx={3}
        />

        {/* ±1 SE band */}
        {showBand && (
          <rect
            x={seLeft}
            y={PAD.t}
            width={seRight - seLeft}
            height={PLOT_H}
            fill="#3bb4a4"
            opacity={0.12}
          />
        )}

        {/* Center guide */}
        <line
          x1={PAD.l}
          y1={PAD.t + PLOT_H / 2}
          x2={PAD.l + PLOT_W}
          y2={PAD.t + PLOT_H / 2}
          stroke="#1e293b"
          strokeWidth={1}
        />

        {/* μ line */}
        <line
          x1={muX}
          y1={PAD.t}
          x2={muX}
          y2={PAD.t + PLOT_H}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="3,2"
          opacity={0.6}
        />

        {/* Dots */}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={DOT_R} fill="#3bb4a4" opacity={0.8} />
        ))}

        {/* Empty state */}
        {means.length === 0 && (
          <text
            x={MINI_W / 2}
            y={PAD.t + PLOT_H / 2 + 3}
            textAnchor="middle"
            fontSize={8}
            fill="#334155"
          >
            No data yet
          </text>
        )}

        {/* X axis */}
        <line
          x1={PAD.l}
          y1={PAD.t + PLOT_H}
          x2={PAD.l + PLOT_W}
          y2={PAD.t + PLOT_H}
          stroke="#334155"
          strokeWidth={1}
        />
        {[70, 100, 130].map((v) => (
          <text
            key={v}
            x={xPos(v)}
            y={PAD.t + PLOT_H + 12}
            fontSize={7}
            fill="#475569"
            textAnchor="middle"
          >
            {v}
          </text>
        ))}
      </svg>
      <p className="text-[10px] text-[#94a3b8] mt-1 text-center">{label}</p>
    </div>
  );
}

export default function StandardErrorVisualizer({
  sampleMeans,
  sampleSize,
  populationSD,
  populationMean,
}: Props) {
  const seActual = computeSE(populationSD, sampleSize);
  const seActualObs =
    sampleMeans.length >= 2 ? computeSD(sampleMeans) : seActual;
  const n5 = sampleSize * 5;
  const seLarger = computeSE(populationSD, n5);

  // For the larger-n card, we show theoretical SE only (no real samples drawn at 5n)
  const largerMeans = useMemo(() => {
    // Generate 20 theoretical dots at 5n to illustrate tighter clustering
    if (sampleMeans.length === 0) return [];
    const count = Math.min(sampleMeans.length, 40);
    const res: number[] = [];
    for (let i = 0; i < count; i++) {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      res.push(
        populationMean + seLarger * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
      );
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleSize, sampleMeans.length, populationMean, seLarger]);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h3 className="text-[13px] font-bold text-white">
          Standard Error Visualizer
        </h3>
        {/* SE formula gold box */}
        <div className="px-2.5 py-1 rounded-lg bg-[#d4af3720] border border-[#d4af3740]">
          <span className="text-[11px] font-mono text-[var(--color-accent)] font-bold">
            SE = σ / √n
          </span>
        </div>
      </div>
      <p className="text-[11px] text-[#475569] mb-4">
        Larger samples produce tighter clustering of sample means: smaller SE
      </p>

      {/* Two mini plots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <MiniDotPlot
          means={sampleMeans}
          se={seActual}
          label={`n = ${sampleSize}`}
          showBand
          populationMean={populationMean}
        />
        <MiniDotPlot
          means={largerMeans}
          se={seLarger}
          label={`n = ${n5} (theoretical)`}
          showBand
          populationMean={populationMean}
        />
      </div>

      {/* Numeric SE comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#1e293b] px-3 py-2.5">
          <p className="text-[9px] text-[#475569] uppercase tracking-[1px] mb-1">
            n = {sampleSize}
          </p>
          <p className="text-[13px] font-mono font-bold text-[#3bb4a4]">
            SE = {seActual.toFixed(3)}
          </p>
          {sampleMeans.length >= 2 && (
            <p className="text-[9px] text-[#475569] mt-0.5">
              Observed: {seActualObs.toFixed(3)}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-[#1e293b] px-3 py-2.5">
          <p className="text-[9px] text-[#475569] uppercase tracking-[1px] mb-1">
            n = {n5}
          </p>
          <p className="text-[13px] font-mono font-bold text-[var(--color-accent)]">
            SE = {seLarger.toFixed(3)}
          </p>
          <p className="text-[9px] text-[#475569] mt-0.5">
            {((1 - seLarger / seActual) * 100).toFixed(0)}% smaller
          </p>
        </div>
      </div>

      {/* Key insight */}
      <div className="mt-3 rounded-xl border border-[#3bb4a420] bg-[#3bb4a408] px-3 py-2">
        <p className="text-[10px] text-[#3bb4a4] leading-relaxed">
          Doubling n reduces SE by a factor of √2 ≈ 1.41. To halve the SE, you need 4× the sample size.
        </p>
      </div>
    </div>
  );
}
