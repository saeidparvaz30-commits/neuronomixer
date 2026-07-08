"use client";

import React, { useState } from "react";
import { computeSE } from "./types";

const PRESET_SIZES = [5, 10, 20, 50, 100, 200] as const;
const POP_SD = 20;

interface Props {
  sampleSize: number;
  onChange: (n: number) => void;
}

export default function SampleSizeControl({ sampleSize, onChange }: Props) {
  const [customVal, setCustomVal] = useState("");
  const [customError, setCustomError] = useState("");

  const se = computeSE(POP_SD, sampleSize);

  function handlePreset(n: number) {
    setCustomVal("");
    setCustomError("");
    onChange(n);
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCustomVal(e.target.value);
    setCustomError("");
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(customVal, 10);
    if (isNaN(n) || n < 2 || n > 500) {
      setCustomError("Enter 2–500");
      return;
    }
    onChange(n);
    setCustomError("");
  }

  const isPreset = (PRESET_SIZES as readonly number[]).includes(sampleSize);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Sample Size (n)
      </p>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Sample size (n)">
        {PRESET_SIZES.map((n) => {
          const active = sampleSize === n;
          return (
            <button
              key={n}
              role="radio"
              aria-checked={active}
              onClick={() => handlePreset(n)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all"
              style={{
                borderColor: active ? "var(--color-accent)" : "#1e293b",
                color: active ? "var(--color-accent)" : "#475569",
                background: active ? "#d4af3718" : "transparent",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 mb-4">
        <input
          type="number"
          min={2}
          max={500}
          value={customVal}
          onChange={handleCustomChange}
          placeholder="Custom (2–500)"
          className="w-36 px-3 py-1.5 rounded-xl text-[11px] bg-[#1e293b] border border-[#334155] text-white placeholder-[#475569] focus:outline-none focus:border-[#3bb4a4] transition-colors"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          Set
        </button>
      </form>
      {customError && (
        <p className="text-[10px] text-red-400 mb-2">{customError}</p>
      )}

      {/* Live SE formula */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b] px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-[#94a3b8] font-mono">
          SE = σ / √n = 20 / √{sampleSize} ≈{" "}
        </span>
        <span className="text-[var(--color-accent)] font-mono font-bold text-[13px] transition-all">
          {se.toFixed(3)}
        </span>
      </div>

      {!isPreset && !customVal && (
        <p className="text-[10px] text-[#3bb4a4] mt-1.5">
          Custom n = {sampleSize}
        </p>
      )}
    </div>
  );
}
