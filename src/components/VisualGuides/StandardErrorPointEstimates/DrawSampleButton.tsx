"use client";

import React from "react";

interface Props {
  onDraw: () => void;
  onDrawMany: () => void;
  onClear: () => void;
  samplesCount: number;
  sampleSize: number;
}

export default function DrawSampleButton({
  onDraw,
  onDrawMany,
  onClear,
  samplesCount,
  sampleSize,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Draw Samples
      </p>

      <div className="flex flex-col gap-2">
        {/* Draw one sample */}
        <button
          onClick={onDraw}
          className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Draw Sample (n = {sampleSize})
        </button>

        {/* Draw 10 more */}
        <button
          onClick={onDrawMany}
          className="w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          Draw 10 More
        </button>

        {/* Clear all */}
        <button
          onClick={onClear}
          disabled={samplesCount === 0}
          className="w-full px-4 py-2.5 rounded-xl text-[12px] font-medium border border-[#1e293b] text-[#475569] hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#1e293b] disabled:hover:text-[#475569]"
        >
          Clear All
        </button>
      </div>

      {samplesCount > 0 && (
        <p className="text-[10px] text-[#94a3b8] mt-3 text-center">
          {samplesCount} sample{samplesCount !== 1 ? "s" : ""} drawn so far
        </p>
      )}
    </div>
  );
}
