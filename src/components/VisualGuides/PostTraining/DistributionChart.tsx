"use client";

import React, { useState } from "react";
import { ChartRow, SERIES_COLORS, StageId } from "./postTrainingMath";

interface Props {
  rows: ChartRow[];
  contextDisplay: string;
}

const LABEL_X = 126;
const BAR_X = 134;
const BAR_MAX_W = 430;
const PCT_X = 570;
const VB_W = 660;
const ROW_H = 46;
const BAR_H = 9;
const BAR_GAP = 12;

const SERIES: { id: StageId; label: string }[] = [
  { id: "base", label: "Base model" },
  { id: "sft", label: "After SFT blend" },
  { id: "assistant", label: "After preference stage" },
];

/**
 * Pure-SVG grouped horizontal bar chart of next-token probabilities.
 * Series are distinguished by color AND by fixed vertical order within each
 * row (top: base, middle: SFT, bottom: preference). Exact values are
 * available in the toggleable table, which is the text equivalent.
 */
export default function DistributionChart({ rows, contextDisplay }: Props) {
  const [showTable, setShowTable] = useState(false);

  const maxP = rows.reduce((m, r) => Math.max(m, r.base, r.sft, r.rl), 0.000001);
  const height = rows.length * ROW_H + 8;

  const barW = (p: number) => Number(((p / maxP) * BAR_MAX_W).toFixed(2));
  const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-4">
          {SERIES.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
              <span
                className="inline-block w-3 h-2 rounded-sm"
                style={{ background: SERIES_COLORS[s.id] }}
                aria-hidden="true"
              />
              {s.label}
            </span>
          ))}
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white transition-colors"
        >
          {showTable ? "Hide exact values" : "Show exact values"}
        </button>
      </div>
      <p className="text-[10px] text-[#475569] mb-2">
        Bar order within each row: base, then SFT, then preference. Bars are scaled to the largest
        displayed probability.
      </p>

      <svg
        viewBox={`0 0 ${VB_W} ${height}`}
        width="100%"
        role="img"
        aria-label={`Next word probabilities after the context ${contextDisplay}, for the base model, the SFT blend, and the preference-tuned model. Use the Show exact values button for a table of the same numbers.`}
      >
        {rows.map((row, i) => {
          const rowTop = i * ROW_H + 4;
          const bars: { id: StageId; p: number }[] = [
            { id: "base", p: row.base },
            { id: "sft", p: row.sft },
            { id: "assistant", p: row.rl },
          ];
          return (
            <g key={row.token}>
              <text
                x={LABEL_X}
                y={rowTop + 24}
                textAnchor="end"
                fontSize={11}
                fill={row.isOther ? "#475569" : "#94a3b8"}
                fontFamily="ui-monospace, monospace"
                fontStyle={row.isOther ? "italic" : "normal"}
              >
                {row.token}
              </text>
              {bars.map((b, j) => {
                const y = rowTop + j * BAR_GAP;
                return (
                  <g key={b.id}>
                    <rect
                      x={BAR_X}
                      y={y}
                      width={Math.max(0.5, barW(b.p))}
                      height={BAR_H}
                      rx={1.5}
                      fill={SERIES_COLORS[b.id]}
                      opacity={row.isOther ? 0.45 : 1}
                    />
                    <text
                      x={PCT_X}
                      y={y + BAR_H - 1}
                      textAnchor="start"
                      fontSize={9}
                      fill={SERIES_COLORS[b.id]}
                      fontFamily="ui-monospace, monospace"
                    >
                      {pct(b.p)}
                    </text>
                  </g>
                );
              })}
              {i < rows.length - 1 && (
                <line
                  x1={0}
                  x2={VB_W}
                  y1={rowTop + ROW_H - 6}
                  y2={rowTop + ROW_H - 6}
                  stroke="#1e293b"
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}
      </svg>

      {showTable && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#1e293b]">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                <th className="px-3 py-2 font-semibold text-[#94a3b8]">Next word</th>
                <th className="px-3 py-2 font-semibold text-[#94a3b8]">Base %</th>
                <th className="px-3 py-2 font-semibold text-[#94a3b8]">After SFT %</th>
                <th className="px-3 py-2 font-semibold text-[#94a3b8]">After preference %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.token} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                  <td className="px-3 py-2 font-mono text-[#f1f5f9]">{row.token}</td>
                  <td className="px-3 py-2 font-mono text-[#94a3b8]">{(row.base * 100).toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-[#3bb4a4]">{(row.sft * 100).toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-[var(--color-accent)]">
                    {(row.rl * 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
