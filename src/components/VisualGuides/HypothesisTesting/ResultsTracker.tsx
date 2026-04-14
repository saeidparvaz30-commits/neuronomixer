"use client";

import React from "react";
import type { TestingState } from "./types";

interface ResultsTrackerProps {
  state: TestingState;
}

function rate(num: number, den: number): string {
  if (den === 0) return "—";
  return ((num / den) * 100).toFixed(1) + "%";
}

function getDynamicInsight(state: TestingState): string {
  const { experimentsCompleted, confusionMatrix, effectSize, alpha, sampleSize } = state;
  const { truePositives: tp, falsePositives: fp, falseNegatives: fn, trueNegatives: tn } = confusionMatrix;
  const total = tp + fp + fn + tn;

  if (experimentsCompleted < 10) {
    return "Run more experiments to see patterns emerge. Try at least 10 to get a sense of the randomness in hypothesis testing.";
  }

  if (experimentsCompleted < 100) {
    const observedTypeI = fp + tn > 0 ? (fp / (fp + tn)) * 100 : null;
    if (effectSize === 0 && observedTypeI !== null) {
      return `With no real effect, your observed Type I rate is ${observedTypeI.toFixed(1)}% vs. α=${(alpha * 100).toFixed(0)}%. Run 100+ experiments for a stable estimate.`;
    }
    if (effectSize > 0) {
      const pwr = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
      return `Observed power: ${pwr.toFixed(1)}%. Increase sample size (currently ${sampleSize}) or effect size to boost power. More experiments will stabilize this estimate.`;
    }
    return "Keep running experiments to see how Type I/II error rates stabilize.";
  }

  // 100+ experiments
  const observedTypeI = fp + tn > 0 ? (fp / (fp + tn)) * 100 : null;
  const power = tp + fn > 0 ? (tp / (tp + fn)) * 100 : null;

  if (effectSize === 0) {
    if (observedTypeI !== null) {
      const diff = Math.abs(observedTypeI - alpha * 100);
      if (diff < 2) return `Excellent! With no effect, your Type I rate (${observedTypeI.toFixed(1)}%) is tracking close to α (${(alpha * 100).toFixed(0)}%) — as expected by theory.`;
      return `With no effect, the Type I rate (${observedTypeI.toFixed(1)}%) should converge to α (${(alpha * 100).toFixed(0)}%) with more runs.`;
    }
  }

  if (effectSize > 0 && power !== null) {
    if (power < 50) return `Power is low (${power.toFixed(1)}%). Consider increasing sample size from ${sampleSize} — try 200 or 300 — or use a larger effect size.`;
    if (power < 80) return `Power is moderate (${power.toFixed(1)}%). The standard benchmark is 80%. Increase n or effect size to reach it.`;
    return `Good power (${power.toFixed(1)}%) — you're reliably detecting the effect. Total experiments: ${total.toLocaleString()}.`;
  }

  return `Running strong with ${total.toLocaleString()} experiments. Try different parameter combinations to explore the full landscape.`;
}

export default function ResultsTracker({ state }: ResultsTrackerProps) {
  const { confusionMatrix, experimentsCompleted, effectSize, sampleSize, alpha } = state;
  const { truePositives: tp, falsePositives: fp, falseNegatives: fn, trueNegatives: tn } = confusionMatrix;

  const observedTypeI = rate(fp, fp + tn);
  const observedTypeII = rate(fn, fn + tp);
  const observedPower = rate(tp, tp + fn);
  const insight = getDynamicInsight(state);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
        Running Summary
      </p>

      {/* Current params */}
      <div className="rounded-lg border border-[#1e293b] p-3 mb-4 space-y-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-[1px] text-[#334155] mb-2">
          Current Parameters
        </p>
        {[
          { label: "Effect size (d)", value: effectSize.toFixed(1) },
          { label: "Sample size (n)", value: String(sampleSize) },
          { label: "Alpha (α)", value: alpha.toFixed(2) },
          { label: "Experiments run", value: experimentsCompleted.toLocaleString() },
          { label: "Scenarios explored", value: String(state.scenariosExplored.size) },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[10px] text-[#475569]">{label}</span>
            <span className="text-[10px] font-mono text-[#d4af37]">{value}</span>
          </div>
        ))}
      </div>

      {/* Observed rates */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Obs. Type I", value: observedTypeI, color: "#f87171" },
          { label: "Obs. Type II", value: observedTypeII, color: "#fb923c" },
          { label: "Obs. Power", value: observedPower, color: "#4ade80" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-[#1e293b] p-2.5 text-center">
            <p className="text-[8px] text-[#475569] mb-1">{label}</p>
            <p className="text-[16px] font-bold font-mono" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Dynamic insight */}
      <div className="rounded-lg border border-[#1e293b] bg-[#1e293b]/30 p-3">
        <p className="text-[9px] font-semibold uppercase tracking-[1px] text-[#475569] mb-1">
          Insight
        </p>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          {insight}
        </p>
      </div>

      {/* Completion hint */}
      {experimentsCompleted < 100 && (
        <p className="text-[9px] text-[#334155] mt-3 text-center">
          Run 100+ experiments and explore 3+ scenarios to complete this guide
        </p>
      )}
      {experimentsCompleted >= 100 && state.scenariosExplored.size < 3 && (
        <p className="text-[9px] text-[#d4af37] mt-3 text-center">
          Explore {3 - state.scenariosExplored.size} more parameter combination(s) to complete
        </p>
      )}
    </div>
  );
}
