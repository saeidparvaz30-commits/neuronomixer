"use client";

import React from "react";
import { TestType } from "./types";

interface Props {
  effectSize: number;
  sampleSize: number;
  alpha: number;
  testType: TestType;
  isRunning: boolean;
  onEffectSizeChange: (v: number) => void;
  onSampleSizeChange: (v: number) => void;
  onAlphaChange: (v: number) => void;
  onTestTypeChange: (v: TestType) => void;
  onRun: () => void;
}

function effectSizeNote(v: number): string {
  if (v === 0) return "No difference between groups";
  if (v < 0.3) return "Negligible effect — hard to detect";
  if (v < 0.5) return "Small effect (Cohen's d < 0.5)";
  if (v < 0.8) return "Medium effect — moderate separation";
  if (v < 1.2) return "Large effect — clearly visible gap";
  return "Very large effect — groups barely overlap";
}

function sampleSizeNote(n: number): string {
  if (n < 20) return "Very small sample — low statistical power";
  if (n < 40) return "Small sample — limited power";
  if (n < 80) return "Moderate sample size";
  if (n < 120) return "Good sample size for medium effects";
  return "Large sample — high power to detect small effects";
}

function alphaNote(a: number): string {
  if (a <= 0.01) return "Very strict — 1% false-positive rate";
  if (a <= 0.05) return "Standard threshold — 5% false-positive rate";
  if (a <= 0.10) return "Lenient — 10% false-positive rate";
  return "Very lenient — many false positives expected";
}

function pct(val: number, min: number, max: number): string {
  return (((val - min) / (max - min)) * 100).toFixed(1) + "%";
}

export default function ExperimentSetup({
  effectSize, sampleSize, alpha, testType,
  isRunning, onEffectSizeChange, onSampleSizeChange,
  onAlphaChange, onTestTypeChange, onRun,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
        Experiment Design
      </p>

      {/* Effect Size */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-white font-medium">Effect Size (Cohen&apos;s d)</span>
          <span className="text-[11px] font-mono text-[#d4af37]">{effectSize.toFixed(1)}</span>
        </div>
        <input
          type="range" min={0} max={2.0} step={0.1} value={effectSize}
          onChange={e => onEffectSizeChange(Number(e.target.value))}
          className="w-full appearance-none h-1.5 rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #d4af37 ${pct(effectSize, 0, 2)}, #1e293b ${pct(effectSize, 0, 2)})`,
          }}
        />
        <p className="text-[9px] text-[#475569] mt-1">{effectSizeNote(effectSize)}</p>
      </div>

      {/* Sample Size */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-white font-medium">Sample Size (n per group)</span>
          <span className="text-[11px] font-mono text-[#d4af37]">{sampleSize}</span>
        </div>
        <input
          type="range" min={10} max={200} step={10} value={sampleSize}
          onChange={e => onSampleSizeChange(Number(e.target.value))}
          className="w-full appearance-none h-1.5 rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #d4af37 ${pct(sampleSize, 10, 200)}, #1e293b ${pct(sampleSize, 10, 200)})`,
          }}
        />
        <p className="text-[9px] text-[#475569] mt-1">{sampleSizeNote(sampleSize)}</p>
      </div>

      {/* Alpha */}
      <div className="mb-5">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-white font-medium">Significance Level (α)</span>
          <span className="text-[11px] font-mono text-[#d4af37]">{alpha.toFixed(2)}</span>
        </div>
        <input
          type="range" min={0.01} max={0.20} step={0.01} value={alpha}
          onChange={e => onAlphaChange(Number(e.target.value))}
          className="w-full appearance-none h-1.5 rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #d4af37 ${pct(alpha, 0.01, 0.20)}, #1e293b ${pct(alpha, 0.01, 0.20)})`,
          }}
        />
        <p className="text-[9px] text-[#475569] mt-1">{alphaNote(alpha)}</p>
      </div>

      {/* Test Type Toggle */}
      <div className="mb-5">
        <p className="text-[11px] text-white font-medium mb-2">Test Type</p>
        <div className="flex gap-1.5">
          {(["two-tailed", "one-tailed"] as TestType[]).map(t => (
            <button
              key={t}
              onClick={() => onTestTypeChange(t)}
              role="switch"
              aria-checked={testType === t}
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors"
              style={{
                borderColor: testType === t ? "#3bb4a4" : "#1e293b",
                color: testType === t ? "#3bb4a4" : "#475569",
                background: testType === t ? "#3bb4a420" : "transparent",
              }}
            >
              {t === "two-tailed" ? "Two-tailed" : "One-tailed"}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-[#475569] mt-1">
          {testType === "two-tailed"
            ? "Tests for a difference in either direction (p × 2)"
            : "Tests for a difference in one direction only"}
        </p>
      </div>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={isRunning}
        className="w-full py-2.5 rounded-xl text-[13px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isRunning ? "Running…" : "Run Experiment"}
      </button>
    </div>
  );
}
