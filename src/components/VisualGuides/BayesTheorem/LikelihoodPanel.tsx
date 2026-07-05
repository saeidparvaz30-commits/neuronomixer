"use client";

import React from "react";
import type { ScenarioType } from "./types";
import { SCENARIO_CONFIGS } from "./types";

interface LikelihoodPanelProps {
  sensitivity: number;
  specificity: number;
  scenario: ScenarioType;
  onSensitivityChange: (v: number) => void;
  onSpecificityChange: (v: number) => void;
}

export default function LikelihoodPanel({
  sensitivity,
  specificity,
  scenario,
  onSensitivityChange,
  onSpecificityChange,
}: LikelihoodPanelProps) {
  const w = SCENARIO_CONFIGS[scenario].wording;
  const falsePositiveRate = (1 - specificity) * 100;
  const falseNegativeRate = (1 - sensitivity) * 100;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
          Likelihood
        </p>
        <h2 className="text-[15px] font-bold text-white">
          How accurate is the test?
        </h2>
      </div>

      {/* Sensitivity slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[12px] text-white font-medium">Sensitivity</span>
            <span className="text-[10px] text-[#475569] ml-1.5">{w.sensitivityFormula}</span>
          </div>
          <span className="text-[13px] font-mono font-bold text-[#3bb4a4]">
            {(sensitivity * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0.5}
          max={1.0}
          step={0.01}
          value={sensitivity}
          onChange={(e) => onSensitivityChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "#3bb4a4" }}
        />
        <p className="text-[10px] text-[#475569]">
          {w.sensitivityDesc}{" "}
          <span className="text-[#3bb4a4] font-semibold">
            {(sensitivity * 100).toFixed(0)}%
          </span>{" "}
          of the time
        </p>
      </div>

      {/* Specificity slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[12px] text-white font-medium">Specificity</span>
            <span className="text-[10px] text-[#475569] ml-1.5">{w.specificityFormula}</span>
          </div>
          <span className="text-[13px] font-mono font-bold text-[#d4af37]">
            {(specificity * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0.5}
          max={1.0}
          step={0.01}
          value={specificity}
          onChange={(e) => onSpecificityChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "#d4af37" }}
        />
        <p className="text-[10px] text-[#475569]">
          {w.specificityDesc}{" "}
          <span className="text-[#d4af37] font-semibold">
            {(specificity * 100).toFixed(0)}%
          </span>{" "}
          of the time
        </p>
      </div>

      {/* Auto-computed badges */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-center">
          <p className="text-[9px] uppercase tracking-[1px] text-[#475569] mb-0.5">
            False Positive Rate
          </p>
          <p className="text-[11px] text-[#94a3b8] font-mono mb-1">
            = 1 − Specificity
          </p>
          <p className="text-[18px] font-black text-[#ef4444]">
            {falsePositiveRate.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-xl border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-2 text-center">
          <p className="text-[9px] uppercase tracking-[1px] text-[#475569] mb-0.5">
            False Negative Rate
          </p>
          <p className="text-[11px] text-[#94a3b8] font-mono mb-1">
            = 1 − Sensitivity
          </p>
          <p className="text-[18px] font-black text-[#f97316]">
            {falseNegativeRate.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}
