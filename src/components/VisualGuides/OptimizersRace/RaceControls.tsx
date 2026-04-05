"use client";

import React from "react";

const MAX_STEPS = 40;

interface Props {
  isPlaying: boolean;
  currentStep: number;
  speed: 0.5 | 1 | 2;
  raceComplete: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (s: 0.5 | 1 | 2) => void;
}

export default function RaceControls({
  isPlaying,
  currentStep,
  speed,
  raceComplete,
  onStart,
  onPause,
  onReset,
  onSpeedChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Step indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#94a3b8]">
          Step: <span className="font-mono font-bold text-white">{currentStep}</span>
          <span className="text-[#475569]"> / {MAX_STEPS}</span>
        </span>
        {raceComplete && (
          <span className="text-[#d4af37] font-semibold text-sm animate-pulse">
            Race Complete!
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full transition-all duration-150"
          style={{ width: `${(currentStep / MAX_STEPS) * 100}%` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Start / Pause */}
        <button
          onClick={isPlaying ? onPause : onStart}
          disabled={raceComplete && !isPlaying && currentStep >= MAX_STEPS}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1e5d8a] hover:bg-[#1e5d8a]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPlaying ? (
            <>
              <span>&#9646;&#9646;</span>
              <span>Pause</span>
            </>
          ) : (
            <>
              <span>&#9654;</span>
              <span>{currentStep === 0 ? "Start Race" : "Resume"}</span>
            </>
          )}
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-white transition-colors"
        >
          <span>&#8635;</span>
          <span>Reset</span>
        </button>

        {/* Speed */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[11px] text-[#475569] mr-1">Speed:</span>
          {([0.5, 1, 2] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                speed === s
                  ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]"
                  : "border-[#334155] text-[#475569] hover:border-[#475569] hover:text-[#94a3b8]"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
