"use client";

import React, { useState } from "react";
import { computePower, computeSampleSize, effectSizeLabel } from "./types";

interface Props {
  targetPower: 0.70 | 0.80 | 0.90;
  plannedD: number;
  plannedAlpha: 0.05 | 0.01;
  plannedN: number;
  onTargetPowerChange: (v: 0.70 | 0.80 | 0.90) => void;
  onPlannedDChange: (v: number) => void;
  onPlannedAlphaChange: (v: 0.05 | 0.01) => void;
  onUsed: () => void;
}

const POWER_OPTS: { value: 0.70 | 0.80 | 0.90; label: string }[] = [
  { value: 0.70, label: "70%" },
  { value: 0.80, label: "80%" },
  { value: 0.90, label: "90%" },
];

const ALPHA_OPTS: { value: 0.05 | 0.01; label: string }[] = [
  { value: 0.05, label: "α = 0.05" },
  { value: 0.01, label: "α = 0.01" },
];

const D_PRESETS = [
  { label: "Small", value: 0.2 },
  { label: "Medium", value: 0.5 },
  { label: "Large", value: 0.8 },
];

const TABLE_NS = [10, 20, 30, 50, 64, 100, 200];

export default function SampleSizePlanner({
  targetPower,
  plannedD,
  plannedAlpha,
  plannedN,
  onTargetPowerChange,
  onPlannedDChange,
  onPlannedAlphaChange,
  onUsed,
}: Props) {
  const [calculated, setCalculated] = useState(false);
  const [fired, setFired] = useState(false);

  function handleCalculate() {
    setCalculated(true);
    if (!fired) {
      setFired(true);
      onUsed();
    }
  }

  function powerColor(p: number): string {
    if (p >= 0.9) return "#22c55e";
    if (p >= 0.8) return "#3bb4a4";
    if (p >= 0.6) return "#d4af37";
    return "#ef4444";
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
        Sample Size Planner
      </p>

      {/* Target power */}
      <div className="mb-4">
        <p className="text-[10px] text-[#94a3b8] mb-2">Target Power</p>
        <div className="flex gap-1">
          {POWER_OPTS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onTargetPowerChange(value)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                targetPower === value
                  ? "bg-[#d4af37] text-[#0a0e1a]"
                  : "bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Effect size */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-[#94a3b8]">Effect Size (d)</p>
          <span className="text-[10px] text-[#475569]">{effectSizeLabel(plannedD)}</span>
        </div>
        <div className="flex gap-2 mb-2">
          {D_PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onPlannedDChange(value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                plannedD === value
                  ? "bg-[#3bb4a4]/20 border border-[#3bb4a4] text-[#3bb4a4]"
                  : "border border-[#1e293b] text-[#475569] hover:border-[#3bb4a4] hover:text-[#3bb4a4]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0.1}
          max={2.0}
          step={0.1}
          value={plannedD}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onPlannedDChange(v);
          }}
          className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-2 text-[12px] font-mono text-white focus:outline-none focus:border-[#d4af37] transition-colors"
        />
      </div>

      {/* Alpha */}
      <div className="mb-4">
        <p className="text-[10px] text-[#94a3b8] mb-2">Significance Level</p>
        <div className="flex gap-1">
          {ALPHA_OPTS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onPlannedAlphaChange(value)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                plannedAlpha === value
                  ? "bg-[#d4af37] text-[#0a0e1a]"
                  : "bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        className="w-full py-2.5 rounded-xl text-[12px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity mb-4"
      >
        Calculate Required n
      </button>

      {/* Result */}
      {calculated && (
        <div className="rounded-xl bg-[#1e293b] p-4 mb-4 text-center">
          <p className="text-[10px] text-[#475569] mb-1">Required sample size</p>
          <p className="text-[32px] font-black font-mono text-[#d4af37]">{plannedN}</p>
          <p className="text-[11px] text-[#94a3b8]">
            per group · total: {plannedN * 2} participants
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            d = {plannedD.toFixed(2)}, α = {plannedAlpha}, target power = {(targetPower * 100).toFixed(0)}%
          </p>
        </div>
      )}

      {/* Power table */}
      <div>
        <p className="text-[10px] text-[#475569] mb-2">
          Power at varying n (d = {plannedD.toFixed(2)}, α = {plannedAlpha})
        </p>
        <div className="overflow-hidden rounded-xl border border-[#1e293b]">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-[#1e293b]">
                <th className="px-3 py-2 text-left text-[#94a3b8] font-semibold">n per group</th>
                <th className="px-3 py-2 text-right text-[#94a3b8] font-semibold">Power</th>
                <th className="px-3 py-2 text-right text-[#94a3b8] font-semibold">β</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_NS.map((n) => {
                const p = computePower(plannedD, n, plannedAlpha, true);
                const color = powerColor(p);
                return (
                  <tr key={n} className="border-t border-[#1e293b]">
                    <td className="px-3 py-2 font-mono text-white">{n}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color }}>
                      {p.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[#475569]">
                      {(1 - p).toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
