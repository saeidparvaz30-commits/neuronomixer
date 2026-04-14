"use client";

import React from "react";

interface Props {
  explanation: string;
  whenToUse: string;
  isBest: boolean;
}

export default function ChartEducationTooltip({ explanation, whenToUse, isBest }: Props) {
  return (
    <div
      className={`rounded-xl border p-4 space-y-2 ${
        isBest
          ? "border-[#3bb4a4]/40 bg-[#3bb4a4]/5"
          : "border-[#ef4444]/30 bg-[#ef4444]/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {isBest ? (
          <svg className="w-4 h-4 text-[#3bb4a4] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-[#ef4444] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className={`text-[12px] font-bold ${isBest ? "text-[#3bb4a4]" : "text-[#ef4444]"}`}>
          {isBest ? "Best choice!" : "Not the best fit"}
        </span>
      </div>
      <p className="text-[13px] text-[#94a3b8] leading-relaxed">{explanation}</p>
      {isBest && (
        <div className="pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">When to use this: </span>
          <span className="text-[12px] text-[#94a3b8]">{whenToUse}</span>
        </div>
      )}
    </div>
  );
}
