"use client";

import React, { useState } from "react";
import { computeCohensD, effectSizeLabel } from "./types";

interface Props {
  group1Mean: number;
  group2Mean: number;
  pooledSD: number;
  onGroup1Change: (v: number) => void;
  onGroup2Change: (v: number) => void;
  onSDChange: (v: number) => void;
  onApply: (d: number) => void;
  isVisible?: boolean;
  onUsed: () => void;
}

const PRESETS = [
  { label: "IQ diff", m1: 100, m2: 110, sd: 15, desc: "d ≈ 0.67" },
  { label: "Clinical trial", m1: 50, m2: 53, sd: 10, desc: "d ≈ 0.3" },
  { label: "Small effect", m1: 0, m2: 2, sd: 10, desc: "d = 0.2" },
];

export default function EffectSizeCalculator({
  group1Mean,
  group2Mean,
  pooledSD,
  onGroup1Change,
  onGroup2Change,
  onSDChange,
  onApply,
  onUsed,
}: Props) {
  const [used, setUsed] = useState(false);

  const d = computeCohensD(group1Mean, group2Mean, pooledSD);
  const label = effectSizeLabel(d);

  const labelColor =
    d < 0.2
      ? "#475569"
      : d < 0.5
      ? "#94a3b8"
      : d < 0.8
      ? "#3bb4a4"
      : "#d4af37";

  function handleApply() {
    onApply(d);
    if (!used) {
      setUsed(true);
      onUsed();
    }
  }

  function handlePreset(preset: (typeof PRESETS)[0]) {
    onGroup1Change(preset.m1);
    onGroup2Change(preset.m2);
    onSDChange(preset.sd);
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Effect Size Calculator
      </p>

      {/* Preset buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            {p.label}
            <span className="ml-1 text-[9px] text-[#475569]">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Number inputs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Group 1 mean", value: group1Mean, onChange: onGroup1Change },
          { label: "Group 2 mean", value: group2Mean, onChange: onGroup2Change },
          { label: "Pooled SD", value: pooledSD, onChange: onSDChange },
        ].map(({ label, value, onChange }) => (
          <div key={label}>
            <label className="block text-[10px] text-[#475569] mb-1">{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(Number(e.target.value) || 0)}
              className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-2 text-[12px] font-mono text-white focus:outline-none focus:border-[#d4af37] transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Result */}
      <div className="rounded-xl bg-[#1e293b] p-3 flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-[#475569]">Cohen&apos;s d = |μ₂ − μ₁| / σ</p>
          <p className="text-[11px] font-mono text-white mt-0.5">
            |{group2Mean} − {group1Mean}| / {pooledSD} = {d.toFixed(3)}
          </p>
        </div>
        <span
          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
          style={{ background: labelColor + "22", color: labelColor }}
        >
          {label}
        </span>
      </div>

      <button
        onClick={handleApply}
        className="w-full py-2 rounded-xl text-[12px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
      >
        Apply d = {d.toFixed(2)} to Visualization
      </button>
    </div>
  );
}
