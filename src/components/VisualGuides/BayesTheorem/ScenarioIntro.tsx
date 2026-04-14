"use client";

import React from "react";
import type { ScenarioType, BayesState } from "./types";
import { SCENARIO_CONFIGS } from "./types";

interface ScenarioIntroProps {
  state: BayesState;
  onScenarioChange: (s: ScenarioType) => void;
  onIntuitionChange: (v: number) => void;
}

export default function ScenarioIntro({
  state,
  onScenarioChange,
  onIntuitionChange,
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
      label: "Test Accuracy",
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
      <p className="text-[13px] text-[#94a3b8] leading-relaxed border-l-2 border-[#d4af37] pl-3">
        {sc.description}
      </p>

      {/* Three big numbers */}
      <div className="grid grid-cols-3 gap-3">
        {bigNumbers.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-3 text-center"
          >
            <p className="text-[9px] uppercase tracking-[1.5px] text-[#475569] mb-1">{label}</p>
            <p className="text-[18px] sm:text-[22px] font-black text-[#d4af37] leading-none">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Intuition slider */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center">
          <p className="text-[11px] text-[#94a3b8]">
            Before we calculate, what&apos;s your intuitive guess?
          </p>
          <span className="text-[13px] font-mono font-bold text-white">
            {state.intuition}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={state.intuition}
          onChange={(e) => onIntuitionChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "#8b5cf6" }}
        />
        <div className="flex justify-between text-[9px] text-[#334155]">
          <span>0%</span>
          <span className="text-[#8b5cf6] font-semibold">Your guess: {state.intuition}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
