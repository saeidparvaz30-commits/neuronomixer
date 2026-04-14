"use client";

import React from "react";

interface Props {
  onDraw: () => void;
  onDrawMore: (n: number) => void;
  onClear: () => void;
  drawCount: number;
}

export default function DrawSampleButton({ onDraw, onDrawMore, onClear, drawCount }: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Draw Samples
        </p>
        {drawCount > 0 && (
          <span className="text-[11px] text-[#94a3b8]">
            <span className="font-semibold text-white">{drawCount}</span> draw{drawCount !== 1 ? "s" : ""} total
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Primary: Draw Sample */}
        <button
          onClick={onDraw}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Draw Sample
        </button>

        {/* Secondary: Draw 10 More */}
        <button
          onClick={() => onDrawMore(10)}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          Draw 10 More
        </button>

        {/* Secondary: Draw 100 More */}
        <button
          onClick={() => onDrawMore(100)}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          Draw 100 More
        </button>

        {/* Tertiary: Clear */}
        {drawCount > 0 && (
          <button
            onClick={onClear}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#475569] hover:text-[#94a3b8] transition-colors ml-auto"
          >
            Clear Repeats
          </button>
        )}
      </div>

      <p className="text-[10px] text-[#334155] mt-3">
        &ldquo;Draw 10 More&rdquo; and &ldquo;Draw 100 More&rdquo; add repeated draws to the distribution chart below — great for seeing sampling variability.
      </p>
    </div>
  );
}
