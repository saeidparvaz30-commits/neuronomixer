"use client";

import React from "react";
import type { HistoryPoint } from "./types";

interface ConvergenceChartProps {
  history: HistoryPoint[];
  theoreticalEV: number;
  totalTrials: number;
  isComplete: boolean;
}

const W = 560;
const H = 200;
const PAD = { top: 20, right: 20, bottom: 40, left: 66 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

export default function ConvergenceChart({
  history,
  theoreticalEV,
  totalTrials,
  isComplete,
}: ConvergenceChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] rounded-xl border border-[#1e293b] bg-[#0a0e1a]">
        <p className="text-[12px] text-[#475569]">Run a simulation to see convergence</p>
      </div>
    );
  }

  const maxTrial = totalTrials;

  // Determine y-axis range around theoretical EV
  const allAvgs = history.map((p) => p.avg);
  const minAvg = Math.min(...allAvgs, theoreticalEV);
  const maxAvg = Math.max(...allAvgs, theoreticalEV);
  const padding = Math.abs(maxAvg - minAvg) * 0.3 || Math.abs(theoreticalEV) * 0.5 || 1;
  const yMin = minAvg - padding;
  const yMax = maxAvg + padding;
  const yRange = yMax - yMin || 1;

  function xOf(trial: number) {
    return PAD.left + (trial / maxTrial) * IW;
  }

  function yOf(val: number) {
    return PAD.top + IH - ((val - yMin) / yRange) * IH;
  }

  // Build SVG path
  const linePath =
    history.length < 2
      ? ""
      : history
          .map((p, i) =>
            `${i === 0 ? "M" : "L"} ${xOf(p.trial).toFixed(1)} ${yOf(p.avg).toFixed(1)}`
          )
          .join(" ");

  // Y-axis ticks — 5 evenly spaced
  const yTicks: number[] = [];
  for (let i = 0; i <= 4; i++) {
    yTicks.push(yMin + (i / 4) * yRange);
  }

  // X-axis ticks
  const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => Math.round(f * maxTrial));

  const evY = yOf(theoreticalEV);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
        Convergence Chart
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 200 }}
        aria-label="Running average converging to expected value"
      >
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={yOf(t)}
            x2={PAD.left + IW}
            y2={yOf(t)}
            stroke="#1e293b"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text
            key={i}
            x={PAD.left - 6}
            y={yOf(t) + 4}
            textAnchor="end"
            fill="#475569"
            fontSize={17}
          >
            {t.toFixed(2)}
          </text>
        ))}

        {/* X-axis ticks */}
        {xTicks.map((trial) => (
          <g key={trial}>
            <line
              x1={xOf(trial)}
              y1={PAD.top + IH}
              x2={xOf(trial)}
              y2={PAD.top + IH + 4}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={xOf(trial)}
              y={H - 4}
              textAnchor="middle"
              fill="#475569"
              fontSize={17}
            >
              {trial >= 1000 ? `${trial / 1000}k` : trial}
            </text>
          </g>
        ))}

        {/* X-axis label */}
        <text
          x={PAD.left + IW / 2}
          y={H - 4}
          textAnchor="middle"
          fill="#475569"
          fontSize={17}
        />

        {/* Axes */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + IH}
          stroke="#334155"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          y1={PAD.top + IH}
          x2={PAD.left + IW}
          y2={PAD.top + IH}
          stroke="#334155"
          strokeWidth={1}
        />

        {/* Theoretical EV dashed line */}
        <line
          x1={PAD.left}
          y1={evY}
          x2={PAD.left + IW}
          y2={evY}
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        <text
          x={PAD.left + IW - 2}
          y={evY - 4}
          textAnchor="end"
          fill="var(--color-accent)"
          fontSize={17}
          fontWeight="600"
        >
          EV = {theoreticalEV.toFixed(3)}
        </text>

        {/* Running average line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#3bb4a4"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Last point dot */}
        {history.length > 0 && (
          <circle
            cx={xOf(history[history.length - 1].trial)}
            cy={yOf(history[history.length - 1].avg)}
            r={3}
            fill="#3bb4a4"
          />
        )}

      </svg>

      {/* Convergence annotation, computed from the actual final gap to EV (HTML so it stays legible) */}
      {isComplete && history.length > 0 && (() => {
        const finalAvg = history[history.length - 1].avg;
        const gap = Math.abs(finalAvg - theoreticalEV);
        const tol = 0.05 * Math.max(Math.abs(theoreticalEV), maxAvg - minAvg, 0.1);
        const converged = gap <= tol;
        return (
          <p
            className="mt-2 text-[11px] font-semibold"
            style={{ color: converged ? "#3bb4a4" : "var(--color-warning)" }}
          >
            {converged
              ? `Converged near EV = ${theoreticalEV.toFixed(3)}`
              : `Average ${finalAvg.toFixed(3)} still differs from EV = ${theoreticalEV.toFixed(3)}: rare outcomes need many more trials`}
          </p>
        );
      })()}

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2">
        <span className="flex items-center gap-1.5 text-[10px] text-[#3bb4a4]">
          <span className="w-4 h-0.5 bg-[#3bb4a4] inline-block rounded-full" />
          Running average
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-accent)]">
          <svg width="16" height="4" className="inline-block">
            <line x1={0} y1={2} x2={16} y2={2} stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4 2" />
          </svg>
          Theoretical EV ({theoreticalEV.toFixed(3)})
        </span>
      </div>
    </div>
  );
}
