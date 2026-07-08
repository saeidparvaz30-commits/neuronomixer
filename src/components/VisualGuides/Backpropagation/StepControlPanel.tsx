"use client";

import React from "react";
import { Step } from "./types";

const TOTAL_STEPS = 8;

interface Props {
  currentStep: Step;
  isAutoPlay: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleAutoPlay: () => void;
}

export default function StepControlPanel({
  currentStep,
  isAutoPlay,
  onPrev,
  onNext,
  onToggleAutoPlay,
}: Props) {
  const progress = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  const isFirst = currentStep === 1;
  const isLast = currentStep === TOTAL_STEPS;

  return (
    <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5">
      {/* Step label + progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">
          Step {currentStep} of {TOTAL_STEPS}
        </span>
        <span className="text-xs text-[#94a3b8]">
          {Math.round(progress)}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden mb-5">
        <div
          className="h-full rounded-full transition-all duration-500 ease-in-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--color-accent), #d4af37cc)",
          }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 mb-5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const s = (i + 1) as Step;
          const isDone = s < currentStep;
          const isCurrent = s === currentStep;
          return (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: isCurrent ? 10 : 7,
                height: isCurrent ? 10 : 7,
                background: isCurrent
                  ? "var(--color-accent)"
                  : isDone
                  ? "#d4af3799"
                  : "#334155",
                boxShadow: isCurrent ? "0 0 6px var(--color-accent)" : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Previous step"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#334155] text-[#94a3b8] text-sm font-semibold transition-all hover:border-[#3bb4a4] hover:text-[#3bb4a4] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ minHeight: 44 }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        <button
          onClick={onNext}
          disabled={isLast}
          aria-label="Next step"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            minHeight: 44,
            background: isLast ? "#1e5d8a50" : "#1e5d8a",
            color: "white",
          }}
        >
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Auto-play toggle */}
      <label className="flex items-center gap-3 mt-4 cursor-pointer group select-none" style={{ minHeight: 44 }}>
        <div className="relative">
          <input
            type="checkbox"
            checked={isAutoPlay}
            onChange={onToggleAutoPlay}
            className="sr-only"
            aria-label="Auto-play steps"
          />
          <div
            className="w-10 h-5 rounded-full transition-colors duration-300"
            style={{ background: isAutoPlay ? "#1e5d8a" : "#334155" }}
          />
          <div
            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300"
            style={{ transform: isAutoPlay ? "translateX(20px)" : "translateX(0)" }}
          />
        </div>
        <span className="text-sm text-[#94a3b8] group-hover:text-white transition-colors">
          Auto-play{" "}
          <span className="text-[11px] text-[#475569]">(2.5s per step)</span>
        </span>
      </label>

      {/* Phase legend */}
      <div className="mt-5 pt-4 border-t border-[#334155]/50 grid grid-cols-2 gap-y-1.5 gap-x-3">
        {[
          { color: "#3bb4a4", label: "Forward Pass", steps: "1–3" },
          { color: "var(--color-accent)", label: "Compute Loss", steps: "4" },
          { color: "#f87171", label: "Backward Pass", steps: "5–7" },
          { color: "#4ade80", label: "Weight Update", steps: "8" },
        ].map(({ color, label, steps }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <span className="text-[11px] text-[#94a3b8] leading-none">
              {label}{" "}
              <span className="text-[#475569]">({steps})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
