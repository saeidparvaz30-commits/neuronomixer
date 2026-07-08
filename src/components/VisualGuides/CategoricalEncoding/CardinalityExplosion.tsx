"use client";

import React from "react";
import { CARD_MIN, CARD_MAX, CARD_ROWS, EXPLOSION_THRESHOLD } from "./types";

interface Props {
  k: number;
  onChange: (k: number) => void;
}

function CardinalityExplosionInner({ k, onChange }: Props) {
  const rowsPerColumn = CARD_ROWS / k;
  const exploded = k > EXPLOSION_THRESHOLD;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <label htmlFor="cardinality-slider" className="text-[12px] text-[#94a3b8] shrink-0">
          Distinct categories (k)
        </label>
        <input
          id="cardinality-slider"
          type="range"
          min={CARD_MIN}
          max={CARD_MAX}
          step={1}
          value={k}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 cursor-pointer"
          style={{ accentColor: "var(--color-accent)" }}
        />
        <span className="text-[13px] font-mono font-bold text-white w-10 text-right shrink-0">
          {k}
        </span>
      </div>

      {/* One column block per one-hot column, computed from k */}
      <div
        className="flex flex-wrap gap-1 mb-4"
        role="img"
        aria-label={`One-hot encoding of ${k} categories produces ${k} columns. At ${CARD_ROWS} rows that is ${rowsPerColumn.toFixed(1)} rows per column, ${
          exploded ? "past" : "not yet past"
        } the explosion threshold of ${EXPLOSION_THRESHOLD} columns.`}
      >
        {Array.from({ length: k }, (_, i) => (
          <span
            key={i}
            className="inline-block w-3 h-6 rounded-[3px] transition-colors"
            style={{
              background: exploded ? "var(--color-warning)" : "#3bb4a4",
              opacity: 0.4 + 0.6 * (1 - i / CARD_MAX),
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">One-hot columns</p>
          <p
            className="text-xl font-black font-mono"
            style={{ color: exploded ? "var(--color-warning)" : "#f1f5f9" }}
          >
            {k}
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">one per category</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Ordinal / freq / target columns</p>
          <p className="text-xl font-black font-mono text-[#f1f5f9]">1</p>
          <p className="text-[10px] text-[#475569] mt-0.5">always, at any k</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Rows per column (n = {CARD_ROWS})</p>
          <p
            className="text-xl font-black font-mono"
            style={{ color: exploded ? "var(--color-warning)" : "#f1f5f9" }}
          >
            {rowsPerColumn.toFixed(1)}
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">{CARD_ROWS} / {k}</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Status</p>
          <p
            className="text-[13px] font-bold mt-1"
            style={{ color: exploded ? "var(--color-warning)" : "var(--color-success)" }}
          >
            {exploded ? "Exploded" : "Manageable"}
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">
            threshold: more than {EXPLOSION_THRESHOLD} columns
          </p>
        </div>
      </div>
    </div>
  );
}

const CardinalityExplosion = React.memo(CardinalityExplosionInner);
export default CardinalityExplosion;
