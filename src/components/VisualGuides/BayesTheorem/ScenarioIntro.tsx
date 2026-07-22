"use client";

import React from "react";
import type { ScenarioType, BayesState } from "./types";
import { SCENARIO_CONFIGS } from "./types";

interface ScenarioIntroProps {
  state: BayesState;
  onScenarioChange: (s: ScenarioType) => void;
  onIntuitionChange: (v: number) => void;
  onApplyIntuition: () => void;
}

export default function ScenarioIntro({
  state,
  onScenarioChange,
  onIntuitionChange,
  onApplyIntuition,
}: ScenarioIntroProps) {
  const sc = SCENARIO_CONFIGS[state.scenario];

  const bigNumbers = [
    {
      label: "Base Rate",
      value:
        state.baseRate < 0.01
          ? `${(state.baseRate * 100).toFixed(1)}%`
          : `${(state.baseRate * 100).toFixed(0)}%`,
    },
    {
      label: "Sensitivity",
      value: `${(state.sensitivity * 100).toFixed(0)}%`,
    },
    {
      label: "Result",
      value: sc.positiveLabel,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Choose Scenario
      </p>

      {/* Scenario radio buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.values(SCENARIO_CONFIGS) as (typeof SCENARIO_CONFIGS)[ScenarioType][]).map((cfg) => (
          <button
            key={cfg.id}
            onClick={() => onScenarioChange(cfg.id)}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all"
            style={{
              borderColor: state.scenario === cfg.id ? "#3bb4a4" : "#1e293b",
              color: state.scenario === cfg.id ? "#3bb4a4" : "#94a3b8",
              background: state.scenario === cfg.id ? "#3bb4a420" : "transparent",
            }}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Scenario description */}
      <p className="text-[13px] text-[#94a3b8] leading-relaxed border-l-2 border-[var(--color-accent)] pl-3">
        {sc.description}
      </p>

      {/* Three big numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {bigNumbers.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-3 text-center"
          >
            <p className="text-[9px] uppercase tracking-[1.5px] text-[#475569] mb-1">{label}</p>
            <p className="text-[18px] sm:text-[22px] font-black text-[var(--color-accent)] leading-none">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Intuition slider */}
      <div className="space-y-3 pt-1 rounded-xl border border-[#1e293b] bg-[#1e293b]/20 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
            Your intuitive guess
          </p>
          <p className="text-[14px] text-white leading-snug">
            {sc.guessQuestion}
          </p>
          <p className="text-[11px] font-mono text-[#a855f7] mt-1">
            {sc.guessSubtext}
          </p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[11px] text-[#94a3b8]">Drag the slider to your gut estimate</span>
          <span className="text-[16px] font-mono font-black text-white">
            {state.intuition}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={state.intuition}
          aria-label="Your gut estimate percentage"
          onChange={(e) => onIntuitionChange(Number(e.target.value))}
          disabled={state.intuitionApplied}
          className="w-full disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ accentColor: "#a855f7" }}
        />
        <div className="flex justify-between text-[9px] text-[#334155]">
          <span>0%</span>
          <span className="text-[#a855f7] font-semibold">Your guess: {state.intuition}%</span>
          <span>100%</span>
        </div>

        <div className="pt-1">
          {state.intuitionApplied ? (
            <div className="flex items-center justify-center gap-2 text-[12px] font-semibold text-[#3bb4a4] bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 rounded-lg py-2.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Guess locked at {state.intuition}%
            </div>
          ) : (
            <button
              onClick={onApplyIntuition}
              className="w-full px-4 py-2.5 rounded-lg text-[13px] font-bold bg-[#a855f7] text-white hover:opacity-90 transition-opacity"
            >
              Apply Guess
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
