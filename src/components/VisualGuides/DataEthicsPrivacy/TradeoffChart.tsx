"use client";

import React from "react";
import { HEALTH_RECORDS, TARGET_K, TriedSetting } from "./types";

interface Props {
  tried: readonly TriedSetting[];
  currentKey: string;
  /** Settings the learner has actively tried, excluding the seeded full-detail point. */
  exploredCount: number;
}

const W = 560;
const H = 260;
const PAD = { left: 52, right: 16, top: 14, bottom: 46 };

export default function TradeoffChart({ tried, currentKey, exploredCount }: Props) {
  const maxK = HEALTH_RECORDS.length;
  const x = (k: number) =>
    PAD.left + ((k - 1) / (maxK - 1)) * (W - PAD.left - PAD.right);
  const y = (u: number) =>
    H - PAD.bottom - (u / 100) * (H - PAD.top - PAD.bottom);

  const kTicks = [1, 5, 10, 16, 24, 32];
  const uTicks = [0, 25, 50, 75, 100];

  const summary =
    tried.length === 0
      ? "No settings tried yet."
      : tried
          .map(
            (t) =>
              `k ${t.k} at ${t.utilityScore.toFixed(0)} percent utility`
          )
          .join("; ");

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
      <p className="text-[13px] font-semibold text-white mb-1">
        The tradeoff curve you are tracing
      </p>
      <p className="text-[11px] text-[#475569] mb-3 leading-relaxed">
        Every setting you try lands here: privacy (k) to the right, analyst
        utility upward. The empty top-right corner is the point of this guide.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Scatter chart of tried defense settings, k anonymity on the horizontal axis from 1 to ${maxK}, utility on the vertical axis from 0 to 100 percent. Points so far: ${summary}`}
      >
        {/* Axes */}
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke="#334155"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={H - PAD.bottom}
          stroke="#334155"
          strokeWidth={1}
        />
        {uTicks.map((u) => (
          <g key={`u${u}`}>
            <line
              x1={PAD.left}
              y1={y(u)}
              x2={W - PAD.right}
              y2={y(u)}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(u) + 5}
              textAnchor="end"
              fontSize={17}
              fill="#475569"
            >
              {u}%
            </text>
          </g>
        ))}
        {kTicks.map((k) => (
          <text
            key={`k${k}`}
            x={x(k)}
            y={H - PAD.bottom + 19}
            textAnchor="middle"
            fontSize={17}
            fill="#475569"
          >
            {k}
          </text>
        ))}
        {/* Target k line */}
        <line
          x1={x(TARGET_K)}
          y1={PAD.top}
          x2={x(TARGET_K)}
          y2={H - PAD.bottom}
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />
        <text
          x={x(TARGET_K) + 4}
          y={PAD.top + 12}
          fontSize={17}
          fill="var(--color-accent)"
        >
          target k = {TARGET_K}
        </text>
        {/* Axis titles */}
        <text
          x={(PAD.left + W - PAD.right) / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={18}
          fill="#94a3b8"
        >
          privacy: k-anonymity (smallest group size)
        </text>
        <text
          x={12}
          y={(PAD.top + H - PAD.bottom) / 2}
          textAnchor="middle"
          fontSize={18}
          fill="#94a3b8"
          transform={`rotate(-90 12 ${(PAD.top + H - PAD.bottom) / 2})`}
        >
          utility
        </text>
        {/* Points */}
        {tried.map((t) => {
          const isCurrent = t.key === currentKey;
          return (
            <g key={t.key}>
              {isCurrent && (
                <circle
                  cx={x(t.k)}
                  cy={y(t.utilityScore)}
                  r={9}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={1.5}
                />
              )}
              <circle
                cx={x(t.k)}
                cy={y(t.utilityScore)}
                r={4.5}
                fill={
                  t.k >= TARGET_K ? "var(--color-success)" : "var(--color-warning)"
                }
                opacity={isCurrent ? 1 : 0.75}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] text-[#94a3b8]">
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ background: "var(--color-warning)" }}
          />
          below target k
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ background: "var(--color-success)" }}
          />
          target reached
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block border border-[var(--color-accent)]" />
          current setting
        </span>
        <span className="ml-auto font-mono">
          {exploredCount} setting{exploredCount === 1 ? "" : "s"} tried
        </span>
      </div>
    </div>
  );
}
