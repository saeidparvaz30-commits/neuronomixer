"use client";

import React from "react";
import { motion } from "framer-motion";

const PRESETS = [1, 10, 50, 99] as const;

interface Props {
  ratio: number;
  onChange: (ratio: number) => void;
}

function ImbalanceControlInner({ ratio, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="inline-flex self-start rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
        role="radiogroup"
        aria-label="Imbalance ratio preset"
      >
        {PRESETS.map((p) => {
          const isActive = ratio === p;
          return (
            <button
              key={p}
              role="radio"
              aria-checked={isActive}
              aria-label={`Imbalance ratio 1 to ${p}`}
              onClick={() => onChange(p)}
              className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="imbalance-pill"
                  className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">1:{p}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <label
          htmlFor="imbalance-slider"
          className="text-[12px] text-[#94a3b8] whitespace-nowrap"
        >
          Imbalance ratio:{" "}
          <span className="font-mono font-semibold text-white">1:{ratio}</span>
        </label>
        <input
          id="imbalance-slider"
          type="range"
          min={1}
          max={99}
          step={1}
          value={ratio}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full max-w-[360px] accent-[#d4af37]"
          aria-label="Imbalance ratio, negatives per positive, from 1 to 99"
        />
      </div>
    </div>
  );
}

const ImbalanceControl = React.memo(ImbalanceControlInner);
export default ImbalanceControl;
