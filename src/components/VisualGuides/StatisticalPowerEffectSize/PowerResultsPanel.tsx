"use client";

import React from "react";
import { effectSizeLabel } from "./types";

interface Props {
  computedPower: number;
  alpha: number;
  cohensD: number;
  sampleSizePerGroup: number;
}

function getPowerTier(power: number): {
  color: string;
  bg: string;
  label: string;
  interpretation: string;
} {
  if (power >= 0.9) {
    return {
      color: "#22c55e",
      bg: "#22c55e22",
      label: "Excellent",
      interpretation:
        "Your study is very well-powered. There is a 90%+ chance of detecting the true effect. Publication-ready for most journals.",
    };
  }
  if (power >= 0.8) {
    return {
      color: "#3bb4a4",
      bg: "#3bb4a422",
      label: "Good",
      interpretation:
        "Meets the conventional 80% power threshold. The standard recommendation for confirmatory studies. β = 1 − power = risk of missing a real effect.",
    };
  }
  if (power >= 0.6) {
    return {
      color: "#d4af37",
      bg: "#d4af3722",
      label: "Marginal",
      interpretation:
        "Below the 0.80 standard. You have a meaningful chance of missing a true effect. Consider increasing n or targeting a larger effect size.",
    };
  }
  return {
    color: "#ef4444",
    bg: "#ef444422",
    label: "Low",
    interpretation:
      "High Type II error risk. This study design is likely underpowered — you may miss a real effect more often than not.",
  };
}

export default function PowerResultsPanel({
  computedPower,
  alpha,
  cohensD,
  sampleSizePerGroup,
}: Props) {
  const tier = getPowerTier(computedPower);
  const beta = 1 - computedPower;
  const dLabel = effectSizeLabel(cohensD);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
        Power Analysis Results
      </p>

      {/* Main power display */}
      <div
        className="rounded-xl p-4 mb-4 text-center"
        style={{ background: tier.bg, border: `1px solid ${tier.color}33` }}
        aria-live="polite"
      >
        <p
          className="text-[52px] font-black font-mono leading-none mb-1"
          style={{ color: tier.color }}
        >
          {computedPower.toFixed(2)}
        </p>
        <p className="text-[12px] font-semibold text-white mb-1">Statistical Power</p>
        <span
          className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: tier.color + "33", color: tier.color }}
        >
          {tier.label}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Significance (α)", value: alpha.toString(), color: "#ef4444" },
          { label: "Type II Error (β)", value: beta.toFixed(2), color: "#d4af37" },
          { label: "Effect Size (d)", value: `${cohensD.toFixed(2)} (${dLabel})`, color: "#3bb4a4" },
          { label: "n per group", value: String(sampleSizePerGroup), color: "#94a3b8" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-0.5">{label}</p>
            <p className="text-[13px] font-bold font-mono" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Interpretation */}
      <div className="rounded-lg bg-[#1e293b] p-3 text-[11px] text-[#94a3b8] leading-relaxed">
        {tier.interpretation}
      </div>
    </div>
  );
}
