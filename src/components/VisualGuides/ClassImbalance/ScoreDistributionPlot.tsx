"use client";

import React from "react";
import { lcg } from "./types";

interface Props {
  pos: number[];
  neg: number[];
  threshold: number;
}

const W = 640;
const H = 240;
const PAD_X = 24;
const PLOT_W = W - PAD_X * 2;

const POS_BAND = { top: 52, height: 46 };
const NEG_BAND = { top: 138, height: 46 };

const POS_COLOR = "#3bb4a4";
const NEG_COLOR = "#a855f7";

function xFor(score: number): number {
  return PAD_X + score * PLOT_W;
}

function ScoreDistributionPlotInner({ pos, neg, threshold }: Props) {
  const xT = xFor(threshold);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Model score strip plot. ${pos.length} positive points centered near 0.62 and ${neg.length} negative points centered near 0.38, on a shared 0 to 1 score axis. Points at or above the threshold ${threshold.toFixed(2)} are predicted positive.`}
      >
        {/* Predicted-positive shading */}
        <rect
          x={xT}
          y={30}
          width={Math.max(0, W - PAD_X - xT)}
          height={H - 60}
          fill="#1e293b"
          opacity={0.45}
        />

        {/* Band labels */}
        <text x={PAD_X} y={POS_BAND.top - 10} fill={POS_COLOR} fontSize={11} fontWeight={600}>
          Positive class (n = {pos.length})
        </text>
        <text x={PAD_X} y={NEG_BAND.top - 10} fill={NEG_COLOR} fontSize={11} fontWeight={600}>
          Negative class (n = {neg.length})
        </text>

        {/* Negative points (majority, drawn first) */}
        {neg.map((s, i) => (
          <circle
            key={`n${i}`}
            cx={xFor(s)}
            cy={NEG_BAND.top + lcg(i * 7919 + 104729) * NEG_BAND.height}
            r={3}
            fill={NEG_COLOR}
            opacity={0.55}
          />
        ))}

        {/* Positive points */}
        {pos.map((s, i) => (
          <circle
            key={`p${i}`}
            cx={xFor(s)}
            cy={POS_BAND.top + lcg(i * 6271 + 15485863) * POS_BAND.height}
            r={3.5}
            fill={POS_COLOR}
            opacity={0.85}
          />
        ))}

        {/* Threshold line */}
        <line
          x1={xT}
          y1={26}
          x2={xT}
          y2={H - 26}
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text
          x={Math.min(xT + 5, W - 130)}
          y={22}
          fill="var(--color-accent)"
          fontSize={10.5}
          fontWeight={600}
        >
          threshold = {threshold.toFixed(2)} (predict + to the right)
        </text>

        {/* Axis */}
        <line x1={PAD_X} y1={H - 22} x2={W - PAD_X} y2={H - 22} stroke="#334155" strokeWidth={1} />
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={xFor(v)} y1={H - 22} x2={xFor(v)} y2={H - 17} stroke="#334155" strokeWidth={1} />
            <text x={xFor(v)} y={H - 6} fill="#475569" fontSize={10} textAnchor="middle">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        <text x={W - PAD_X} y={H - 34} fill="#475569" fontSize={10} textAnchor="end">
          model score
        </text>
      </svg>
      <p className="text-[11px] text-[#475569] leading-relaxed mt-2">
        Both class score distributions are fixed Gaussians (positive mean 0.62, negative
        mean 0.38, both sd 0.15, deterministic stratified samples). The imbalance slider
        changes only how many points each class contributes: currently {pos.length}{" "}
        positive vs {neg.length} negative.
      </p>
    </div>
  );
}

const ScoreDistributionPlot = React.memo(ScoreDistributionPlotInner);
export default ScoreDistributionPlot;
