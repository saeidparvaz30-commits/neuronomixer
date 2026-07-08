"use client";

import React from "react";
import { ConfidenceLevel, SampleSizeState } from "./types";

interface Props {
  state: SampleSizeState;
  onMOEChange: (v: number) => void;
  onConfidenceChange: (v: ConfidenceLevel) => void;
  onProportionChange: (v: number) => void;
  onFinitePopulationToggle: (v: boolean) => void;
  onPopulationSizeChange: (v: number) => void;
}

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [90, 95, 99];

const CL_DESCRIPTIONS: Record<ConfidenceLevel, string> = {
  90: "90% CI: if you repeated the survey 100 times, ~90 would include the true value",
  95: "95% CI: if you repeated the survey 100 times, ~95 would include the true value",
  99: "99% CI: if you repeated the survey 100 times, ~99 would include the true value",
};

// Log-scale population slider helpers
function popToSlider(pop: number): number {
  // Map [1000, 10_000_000] → [0, 100]
  return ((Math.log10(pop) - 3) / (7 - 3)) * 100;
}

function sliderToPop(v: number): number {
  return Math.round(Math.pow(10, 3 + (v / 100) * (7 - 3)));
}

function formatPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export default function SampleSizeCalculator({
  state,
  onMOEChange,
  onConfidenceChange,
  onProportionChange,
  onFinitePopulationToggle,
  onPopulationSizeChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-6">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Calculator Inputs
      </p>

      {/* 1. Margin of Error */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="moe-slider"
            className="text-[13px] font-semibold text-white"
          >
            Desired Margin of Error
          </label>
          <span className="text-[14px] font-bold text-[var(--color-accent)]">
            ±{state.marginOfError}%
          </span>
        </div>
        <p className="text-[11px] text-[#94a3b8] mb-2">
          How close to the true value do you need?
        </p>
        <input
          id="moe-slider"
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={state.marginOfError}
          onChange={(e) => onMOEChange(parseFloat(e.target.value))}
          className="w-full accent-[var(--color-accent)] cursor-pointer"
          aria-label="Desired margin of error"
          aria-valuenow={state.marginOfError}
          aria-valuemin={1}
          aria-valuemax={10}
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
          <span>1%</span>
          <span>10%</span>
        </div>
      </div>

      {/* 2. Confidence Level */}
      <div>
        <p className="text-[13px] font-semibold text-white mb-2">
          Confidence Level
        </p>
        <div className="flex gap-2" role="radiogroup" aria-label="Confidence level">
          {CONFIDENCE_LEVELS.map((cl) => {
            const active = cl === state.confidenceLevel;
            return (
              <button
                key={cl}
                role="radio"
                aria-checked={active}
                onClick={() => onConfidenceChange(cl)}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all"
                style={{
                  borderColor: active ? "var(--color-accent)" : "#1e293b",
                  color: active ? "var(--color-accent)" : "#475569",
                  background: active ? "#d4af3718" : "transparent",
                }}
              >
                {cl}%
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#94a3b8] mt-2">
          {CL_DESCRIPTIONS[state.confidenceLevel]}
        </p>
      </div>

      {/* 3. Estimated Proportion */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="prop-slider"
            className="text-[13px] font-semibold text-white"
          >
            Expected Proportion
          </label>
          <span className="text-[14px] font-bold text-[#3bb4a4]">
            p = {Math.round(state.estimatedProportion * 100)}%
          </span>
        </div>
        <p className="text-[11px] text-[#94a3b8] mb-2">
          Use 50% if unsure: this gives the largest (most conservative) sample
          size
        </p>
        <input
          id="prop-slider"
          type="range"
          min={10}
          max={90}
          step={5}
          value={Math.round(state.estimatedProportion * 100)}
          onChange={(e) =>
            onProportionChange(parseInt(e.target.value, 10) / 100)
          }
          className="w-full accent-[#3bb4a4] cursor-pointer"
          aria-label="Expected proportion"
          aria-valuenow={Math.round(state.estimatedProportion * 100)}
          aria-valuemin={10}
          aria-valuemax={90}
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
          <span>10%</span>
          <span>50% (max)</span>
          <span>90%</span>
        </div>
      </div>

      {/* 4. Finite Population Correction */}
      <div className="rounded-xl border border-[#1e293b] p-4">
        <label className="flex items-center gap-2.5 cursor-pointer mb-1">
          <input
            type="checkbox"
            checked={state.useFinitePopulation}
            onChange={(e) => onFinitePopulationToggle(e.target.checked)}
            className="w-4 h-4 accent-[#3bb4a4] cursor-pointer"
          />
          <span className="text-[13px] font-semibold text-white">
            Use finite population correction?
          </span>
        </label>
        <p className="text-[11px] text-[#94a3b8] ml-6 mb-3">
          FPC reduces required n when population is small relative to sample
        </p>

        {state.useFinitePopulation && (
          <div className="ml-6">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="pop-slider"
                className="text-[12px] text-[#94a3b8]"
              >
                Population size
              </label>
              <span className="text-[13px] font-bold text-white">
                N = {formatPop(state.populationSize)}
              </span>
            </div>
            <input
              id="pop-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={popToSlider(state.populationSize)}
              onChange={(e) =>
                onPopulationSizeChange(sliderToPop(parseFloat(e.target.value)))
              }
              className="w-full accent-[#3bb4a4] cursor-pointer"
              aria-label="Population size"
              aria-valuenow={state.populationSize}
              aria-valuemin={1000}
              aria-valuemax={10000000}
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
              <span>1K</span>
              <span>10M</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
