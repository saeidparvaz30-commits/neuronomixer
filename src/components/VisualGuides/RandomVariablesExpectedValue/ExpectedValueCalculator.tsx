"use client";

import React from "react";
import type { PayoutRow } from "./types";
import { computeEV, probabilitiesValid } from "./types";

interface ExpectedValueCalculatorProps {
  rows: PayoutRow[];
  label?: string;
}

export default function ExpectedValueCalculator({ rows, label }: ExpectedValueCalculatorProps) {
  const isValid = probabilitiesValid(rows);
  const ev = computeEV(rows);

  const evColor =
    !isValid
      ? "text-[#94a3b8]"
      : ev > 0.005
      ? "text-[#3bb4a4]"
      : ev < -0.005
      ? "text-[#ef4444]"
      : "text-[#94a3b8]";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
        {label ?? "Expected Value"}
      </p>

      {/* Formula header */}
      <div className="mb-4 p-3 rounded-xl bg-[#0a0e1a] border border-[#1e293b]">
        <p className="text-[13px] font-mono text-[var(--color-accent)] text-center">
          EV = Σ xᵢ · pᵢ
        </p>
      </div>

      {/* Term breakdown */}
      <div className="space-y-1.5 mb-4">
        {rows.map((row, i) => {
          const contribution = row.outcome * row.probability;
          const sign = contribution >= 0 ? "+" : "";
          return (
            <div key={row.id} className="flex items-center justify-between text-[12px] font-mono">
              <span className="text-[#94a3b8]">
                {i === 0 ? "  " : "+ "}
                <span className="text-white">
                  ({row.outcome >= 0 ? "" : ""}
                  {row.outcome.toLocaleString("en-US", { maximumFractionDigits: 2 })})
                </span>
                <span className="text-[#475569] mx-1">×</span>
                <span className="text-[#3bb4a4]">
                  {row.probability.toFixed(4)}
                </span>
              </span>
              <span
                className={`font-semibold ${
                  contribution > 0.0001
                    ? "text-[#3bb4a4]"
                    : contribution < -0.0001
                    ? "text-[#ef4444]"
                    : "text-[#94a3b8]"
                }`}
              >
                {sign}
                {contribution.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-[#1e293b] pt-3 flex items-center justify-between">
        <span className="text-[13px] text-[#94a3b8] font-semibold">Expected Value (EV)</span>
        <span className={`text-[22px] font-black font-mono ${evColor}`}>
          {isValid
            ? (ev >= 0 ? "+" : "") + ev.toFixed(4)
            : "—"}
        </span>
      </div>

      {/* Interpretation chip */}
      {isValid && (
        <div className="mt-3">
          {Math.abs(ev) < 0.005 ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#334155] px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" />
              <span className="text-[11px] text-[#94a3b8]">Fair game: zero expected gain</span>
            </div>
          ) : ev > 0 ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#3bb4a4]/30 bg-[#3bb4a4]/10 px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3bb4a4]" />
              <span className="text-[11px] text-[#3bb4a4]">Positive EV: favors the player</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              <span className="text-[11px] text-[#ef4444]">Negative EV: house always wins</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
