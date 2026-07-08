"use client";

import React from "react";

interface SimulationControlsProps {
  sampleSize: number;
  onSampleSizeChange: (n: number) => void;
  onDrawOne: () => void;
  onRunThousand: () => void;
  onReset: () => void;
  isRunning: boolean;
  samplesCount: number;
}

export default function SimulationControls({
  sampleSize,
  onSampleSizeChange,
  onDrawOne,
  onRunThousand,
  onReset,
  isRunning,
  samplesCount,
}: SimulationControlsProps) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <h2 className="text-[13px] font-bold text-white mb-1">Simulation Controls</h2>
      <p className="text-[11px] text-[#475569] mb-4">
        Adjust sample size and draw samples to build the sampling distribution.
      </p>

      {/* Sample Size Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="sample-size-slider"
            className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-[1px]"
          >
            Sample Size per Draw
          </label>
          <span className="text-[13px] font-bold text-[var(--color-accent)] font-mono">n = {sampleSize}</span>
        </div>

        <div className="relative">
          <input
            id="sample-size-slider"
            type="range"
            min={5}
            max={500}
            step={5}
            value={sampleSize}
            onChange={(e) => onSampleSizeChange(Number(e.target.value))}
            aria-label="Sample size per draw"
            aria-valuenow={sampleSize}
            aria-valuemin={5}
            aria-valuemax={500}
            disabled={isRunning}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((sampleSize - 5) / 495) * 100}%, #1e293b ${((sampleSize - 5) / 495) * 100}%, #1e293b 100%)`,
              // Webkit thumb
              WebkitAppearance: "none",
            }}
          />
          <style>{`
            #sample-size-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: var(--color-accent);
              cursor: pointer;
              border: 2px solid #0f172a;
              box-shadow: 0 0 0 1px var(--color-accent);
            }
            #sample-size-slider::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: var(--color-accent);
              cursor: pointer;
              border: 2px solid #0f172a;
            }
          `}</style>
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[#334155]">5</span>
          <span className="text-[9px] text-[#334155]">500</span>
        </div>
        <p className="text-[9px] text-[#475569] mt-1">
          Larger n → narrower sampling distribution (SE = σ/√n)
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onDrawOne}
          disabled={isRunning}
          className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Draw 1 Sample
        </button>

        <button
          onClick={onRunThousand}
          disabled={isRunning}
          aria-live="polite"
          className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRunning ? "Running…" : "Run 1000×"}
        </button>

        <button
          onClick={onReset}
          disabled={isRunning}
          className="px-3 py-2 rounded-xl text-[11px] text-[#475569] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
        >
          Reset
        </button>
      </div>

      {samplesCount > 0 && (
        <p className="text-[9px] text-[#475569] mt-3">
          {samplesCount} sample{samplesCount === 1 ? "" : "s"} drawn so far
        </p>
      )}
    </div>
  );
}
