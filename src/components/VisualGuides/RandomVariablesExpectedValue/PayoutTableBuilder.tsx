"use client";

import React, { useCallback } from "react";
import type { PayoutRow } from "./types";
import { sumProbabilities, probabilitiesValid } from "./types";

interface PayoutTableBuilderProps {
  rows: PayoutRow[];
  readOnly?: boolean;
  onRowChange: (id: string, field: "outcome" | "probability", value: number) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
}

export default function PayoutTableBuilder({
  rows,
  readOnly = false,
  onRowChange,
  onAddRow,
  onRemoveRow,
}: PayoutTableBuilderProps) {
  const probSum = sumProbabilities(rows);
  const isValid = probabilitiesValid(rows);

  const handleOutcomeChange = useCallback(
    (id: string, raw: string) => {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) onRowChange(id, "outcome", parsed);
    },
    [onRowChange]
  );

  const handleProbabilityChange = useCallback(
    (id: string, raw: string) => {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) onRowChange(id, "probability", Math.max(0, Math.min(1, parsed)));
    },
    [onRowChange]
  );

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-0.5">
            Payout Table
          </p>
          <p className="text-[12px] text-[#475569]">
            Define outcomes xᵢ and their probabilities pᵢ
          </p>
        </div>
        {/* Σ pᵢ indicator */}
        <div className="text-right">
          <p className="text-[10px] text-[#94a3b8] mb-0.5">Σ pᵢ</p>
          <p
            className={`text-[15px] font-bold font-mono ${
              isValid ? "text-[#3bb4a4]" : "text-[#ef4444]"
            }`}
          >
            {probSum.toFixed(3)}
          </p>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
          Outcome (xᵢ)
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
          Probability (pᵢ)
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
          xᵢ · pᵢ
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] w-6" />
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row) => {
          const contribution = row.outcome * row.probability;
          return (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
              {readOnly ? (
                <div className="h-9 rounded-lg border border-[#1e293b] bg-[#0a0e1a] flex items-center px-3">
                  <span className="text-[13px] text-white font-mono">
                    {row.outcome >= 0 ? "+" : ""}
                    {row.outcome.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <input
                  type="number"
                  defaultValue={row.outcome}
                  onBlur={(e) => handleOutcomeChange(row.id, e.target.value)}
                  className="h-9 rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-3 text-[13px] text-white font-mono focus:outline-none focus:border-[#3bb4a4] transition-colors w-full"
                />
              )}
              {readOnly ? (
                <div className="h-9 rounded-lg border border-[#1e293b] bg-[#0a0e1a] flex items-center px-3">
                  <span className="text-[13px] text-white font-mono">{row.probability.toFixed(4)}</span>
                </div>
              ) : (
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  defaultValue={row.probability}
                  onBlur={(e) => handleProbabilityChange(row.id, e.target.value)}
                  className="h-9 rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-3 text-[13px] text-white font-mono focus:outline-none focus:border-[#3bb4a4] transition-colors w-full"
                />
              )}
              <div className="h-9 rounded-lg border border-[#1e293b] bg-[#0a0e1a] flex items-center px-3">
                <span
                  className={`text-[13px] font-mono font-semibold ${
                    contribution > 0
                      ? "text-[#3bb4a4]"
                      : contribution < 0
                      ? "text-[#ef4444]"
                      : "text-[#94a3b8]"
                  }`}
                >
                  {contribution >= 0 ? "+" : ""}
                  {contribution.toFixed(4)}
                </span>
              </div>
              {readOnly ? (
                <div className="w-6" />
              ) : (
                <button
                  onClick={() => onRemoveRow(row.id)}
                  disabled={rows.length <= 2}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[#475569] hover:text-[#ef4444] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Remove row"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add row button */}
      {!readOnly && (
        <button
          onClick={onAddRow}
          className="mt-4 flex items-center gap-2 text-[12px] text-[#94a3b8] hover:text-white transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#3bb4a4]">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add outcome
        </button>
      )}

      {/* Warning banner */}
      {!isValid && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#7c2d12]/20 border border-[#7c2d12]/40 px-3 py-2.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#f97316] shrink-0 mt-0.5">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-[12px] text-[#f97316]">
            Probabilities sum to <strong>{probSum.toFixed(4)}</strong> — must equal 1.000 (±0.001) to
            run a valid simulation.
          </p>
        </div>
      )}
    </div>
  );
}
