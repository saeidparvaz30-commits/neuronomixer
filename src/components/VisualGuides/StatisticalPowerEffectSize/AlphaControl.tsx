"use client";

import React from "react";

type AlphaValue = 0.05 | 0.01 | 0.001;

interface Props {
  value: AlphaValue;
  twoTailed: boolean;
  onChange: (v: AlphaValue) => void;
  onTwoTailedChange: (v: boolean) => void;
}

const OPTIONS: { value: AlphaValue; label: string }[] = [
  { value: 0.05, label: "α = 0.05" },
  { value: 0.01, label: "α = 0.01" },
  { value: 0.001, label: "α = 0.001" },
];

const DESCRIPTIONS: Record<string, string> = {
  "0.05": "Standard significance threshold — 5% false positive rate",
  "0.01": "Stricter threshold — 1% false positive rate",
  "0.001": "Very strict — used in genome-wide association studies",
};

export default function AlphaControl({
  value,
  twoTailed,
  onChange,
  onTwoTailedChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Significance Level (α)
      </p>

      {/* Alpha toggle group */}
      <div className="flex gap-1 mb-3">
        {OPTIONS.map(({ value: v, label }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
              value === v
                ? "bg-[#d4af37] text-[#0a0e1a]"
                : "bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-[#94a3b8] mb-3">{DESCRIPTIONS[String(value)]}</p>

      {/* Two-tailed toggle */}
      <div className="flex items-center gap-3">
        <button
          role="switch"
          aria-checked={twoTailed}
          onClick={() => onTwoTailedChange(!twoTailed)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            twoTailed ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              twoTailed ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-[11px] text-[#94a3b8]">
          {twoTailed ? "Two-tailed test" : "One-tailed test"}
        </span>
      </div>

      <p className="mt-2 text-[10px] text-[#475569] leading-relaxed">
        Two-tailed tests are more conservative — they split α across both tails.
        Use one-tailed only when the direction of effect is known in advance.
      </p>
    </div>
  );
}
