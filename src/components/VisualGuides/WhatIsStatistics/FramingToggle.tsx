"use client";

import React from "react";
import type { FramingType } from "./types";

interface Props {
  framing: FramingType;
  onChange: (f: FramingType) => void;
  framings: Record<FramingType, string>;
}

const LABELS: Record<FramingType, string> = {
  descriptive: "Descriptive",
  inferential: "Inferential",
  predictive: "Predictive",
};

export default function FramingToggle({ framing, onChange, framings }: Props) {
  return (
    <div className="mt-6">
      <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">
        View this question as...
      </p>
      <div
        role="tablist"
        aria-label="Framing type"
        className="flex gap-1.5 flex-wrap mb-4"
      >
        {(Object.keys(LABELS) as FramingType[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={framing === f}
            aria-controls="framing-content"
            onClick={() => onChange(f)}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold border transition-all ${
              framing === f
                ? "bg-[#d4af37] border-[#d4af37] text-[#0a0e1a]"
                : "border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37]"
            }`}
          >
            {LABELS[f]}
          </button>
        ))}
      </div>
      <div
        id="framing-content"
        role="tabpanel"
        className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-4 py-3 text-[13px] text-[#94a3b8] leading-relaxed"
      >
        <span className="text-[#d4af37] font-semibold mr-1">{LABELS[framing]}:</span>
        {framings[framing]}
      </div>
    </div>
  );
}
