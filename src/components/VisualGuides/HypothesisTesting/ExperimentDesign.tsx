"use client";

import React from "react";

interface ExperimentDesignProps {
  effectSize: number;
  sampleSize: number;
  alpha: number;
  isRunning: boolean;
  onEffectSizeChange: (v: number) => void;
  onSampleSizeChange: (v: number) => void;
  onAlphaChange: (v: number) => void;
}

// Thresholds match the Cohen ruler shown in the UI (small 0.2, medium 0.5,
// large 0.8); boundary values belong to the named tier, so d = 0.5 is Medium.
function effectLabel(es: number): string {
  if (es === 0) return "No effect (null true)";
  if (es < 0.2) return "Very small effect";
  if (es < 0.5) return "Small effect";
  if (es < 0.8) return "Medium effect";
  return "Large effect";
}

function effectExplanation(es: number): string {
  if (es === 0) {
    return "Effect size is 0: the null hypothesis is true. Any rejection will be a Type I error (false positive).";
  }
  if (es < 0.2) {
    return "Very small real effect. Detecting it reliably requires a large sample size.";
  }
  if (es < 0.5) {
    return "Small real effect. You'll need a reasonably large sample to achieve good power.";
  }
  if (es < 0.8) {
    return "Medium real effect. Standard sample sizes can detect this with decent power.";
  }
  return "Large real effect. Even smaller samples can reliably detect this difference.";
}

function sliderBackground(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, var(--color-accent) ${pct}%, #1e293b ${pct}%)`;
}

export default function ExperimentDesign({
  effectSize,
  sampleSize,
  alpha,
  isRunning,
  onEffectSizeChange,
  onSampleSizeChange,
  onAlphaChange,
}: ExperimentDesignProps) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <style>{`
        .ht-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid #0f172a;
          box-shadow: 0 0 0 2px var(--color-accent);
        }
        .ht-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid #0f172a;
          box-shadow: 0 0 0 2px var(--color-accent);
        }
        .ht-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        .ht-slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-5">
        Experiment Design
      </p>

      {/* Effect Size */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-white font-medium">Effect Size (Cohen's d)</span>
          <span className="text-[12px] font-mono text-[var(--color-accent)]">{effectSize.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#475569]">No effect (null true)</span>
          <span className="text-[10px] text-[#475569]">Large</span>
        </div>
        <input
          type="range"
          className="ht-slider"
          min={0}
          max={2.0}
          step={0.1}
          value={effectSize}
          aria-label="Effect size (Cohen's d)"
          disabled={isRunning}
          onChange={e => onEffectSizeChange(Number(e.target.value))}
          style={{ background: sliderBackground(effectSize, 0, 2.0) }}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[#475569]">0</span>
          <span className="text-[10px] text-[#475569]">Small 0.2</span>
          <span className="text-[10px] text-[#475569]">Medium 0.5</span>
          <span className="text-[10px] text-[#475569]">Large 0.8+</span>
          <span className="text-[10px] text-[#475569]">2.0</span>
        </div>
        <p className="mt-2 text-[11px] text-[#94a3b8] leading-relaxed">
          <span
            className="font-semibold"
            style={{ color: effectSize === 0 ? "#ef4444" : "#3bb4a4" }}
          >
            {effectLabel(effectSize)}:
          </span>{" "}
          {effectExplanation(effectSize)}
        </p>
      </div>

      {/* Sample Size */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-white font-medium">Sample Size (n per group)</span>
          <span className="text-[12px] font-mono text-[var(--color-accent)]">{sampleSize}</span>
        </div>
        <input
          type="range"
          className="ht-slider"
          min={10}
          max={500}
          step={10}
          value={sampleSize}
          aria-label="Sample size per group"
          disabled={isRunning}
          onChange={e => onSampleSizeChange(Number(e.target.value))}
          style={{ background: sliderBackground(sampleSize, 10, 500) }}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[#475569]">10</span>
          <span className="text-[10px] text-[#475569]">500</span>
        </div>
      </div>

      {/* Alpha */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-white font-medium">Significance Level (α)</span>
          <span className="text-[12px] font-mono text-[var(--color-accent)]">{alpha.toFixed(2)}</span>
        </div>
        <input
          type="range"
          className="ht-slider"
          min={0.01}
          max={0.20}
          step={0.01}
          value={alpha}
          aria-label="Significance level (alpha)"
          disabled={isRunning}
          onChange={e => onAlphaChange(Number(e.target.value))}
          style={{ background: sliderBackground(alpha, 0.01, 0.20) }}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[#475569]">0.01 (strict)</span>
          <span className="text-[10px] text-[#475569]">0.20 (lenient)</span>
        </div>
      </div>

      {/* Summary row */}
      <div className="rounded-lg border border-[#1e293b] p-3 text-[11px] text-[#94a3b8] space-y-1">
        <div className="flex justify-between">
          <span>H₀:</span>
          <span className="text-white">μ₁ = μ₂ (no effect)</span>
        </div>
        <div className="flex justify-between">
          <span>H₁:</span>
          <span className="text-white">μ₁ ≠ μ₂ (two-tailed)</span>
        </div>
        <div className="flex justify-between">
          <span>True state:</span>
          <span
            style={{ color: effectSize === 0 ? "#ef4444" : "#3bb4a4" }}
            className="font-semibold"
          >
            {effectSize === 0 ? "H₀ true (null)" : "H₁ true (effect exists)"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Reject if p &lt;</span>
          <span className="font-mono text-[var(--color-accent)]">{alpha.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
