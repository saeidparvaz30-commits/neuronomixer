"use client";

import React from "react";
import { heatCellColor, TYPE_LABELS } from "./attentionMath";

type Props = {
  /** Rows = cue type, cols = slot (canonical episode typed A, B, C, D). */
  heat: number[][];
  title: string;
  subtitle?: string;
};

/**
 * Cue x slot attention-weight heatmap on the canonical probe episode.
 * Every cell shows its numeric weight, so color is never the only signal.
 */
export default function AttentionHeatmap({ heat, title, subtitle }: Props) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-white mb-0.5">{title}</p>
      {subtitle && (
        <p className="text-[10px] text-[#475569] mb-2">{subtitle}</p>
      )}
      <table
        className="w-full text-[10px]"
        style={{ borderCollapse: "collapse" }}
      >
        <caption className="sr-only">
          Attention weights by cue type and slot on the probe episode. Rows are
          cue types, columns are slots typed A through D in order. Each cell
          shows the softmax weight.
        </caption>
        <thead>
          <tr className="bg-[#1e293b] text-[#94a3b8]">
            <th className="px-2 py-1.5 text-left font-semibold">cue</th>
            {TYPE_LABELS.map((t, i) => (
              <th key={t} className="px-2 py-1.5 text-center font-semibold">
                slot {i + 1} ({t})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heat.map((row, r) => (
            <tr key={r}>
              <td className="px-2 py-1 font-mono font-bold text-white bg-[#162032]">
                {TYPE_LABELS[r]}
              </td>
              {row.map((w, c) => (
                <td
                  key={c}
                  className="px-2 py-2 text-center font-mono"
                  style={{
                    background: heatCellColor(w),
                    color: w > 0.5 ? "#0a0e1a" : "#94a3b8",
                    fontWeight: r === c ? 700 : 400,
                  }}
                >
                  {w.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-[#475569] mt-1.5">
        A perfect lookup is a bright diagonal: cue A attends to the slot typed
        A, and so on. Weights in each row sum to 1.
      </p>
    </div>
  );
}
