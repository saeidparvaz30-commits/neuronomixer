"use client";

import React from "react";
import { motion } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  Phase1State,
  MetricName,
  TestDirection,
  computeSampleSize,
  normalQuantile,
  zAlphaFor,
} from "./types";

interface Props {
  state: Phase1State;
  onChange: (state: Phase1State) => void;
  onNext: () => void;
}

const METRICS: MetricName[] = ["Conversion Rate", "Revenue per User", "Click-through Rate"];

export default function Phase1Design({ state, onChange, onNext }: Props) {
  const { fadeUp } = useGuideMotion();
  const { hypothesis, metric, parameters } = state;

  function update(partial: Partial<Phase1State>) {
    const next = { ...state, ...partial };
    next.sampleSize = computeSampleSize(
      next.metric.baselineRate,
      next.parameters.mde,
      next.parameters.alpha,
      next.parameters.power,
      next.hypothesis.direction
    );
    onChange(next);
  }

  const zAlpha = zAlphaFor(parameters.alpha, hypothesis.direction);
  const zPower = normalQuantile(parameters.power);
  const p = metric.baselineRate;
  const p2 = Math.min(0.999, p + parameters.mde);
  const pBar = (p + p2) / 2;
  const formulaResult = state.sampleSize;

  const canProceed =
    hypothesis.h0.trim().length > 3 && hypothesis.h1.trim().length > 3;

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Hypothesis */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Hypothesis Formulation</h3>
        <p className="text-[12px] text-[#94a3b8] mb-4">
          Define your null and alternative hypotheses before running the experiment.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-1.5">
              H₀: Null Hypothesis
            </label>
            <input
              type="text"
              value={hypothesis.h0}
              onChange={(e) =>
                update({ hypothesis: { ...hypothesis, h0: e.target.value } })
              }
              placeholder="e.g. There is no difference in conversion rate between variants A and B"
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b] text-white text-sm px-4 py-3 placeholder:text-[#475569] focus:outline-none focus:border-[#1e5d8a] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-1.5">
              H₁: Alternative Hypothesis
            </label>
            <input
              type="text"
              value={hypothesis.h1}
              onChange={(e) =>
                update({ hypothesis: { ...hypothesis, h1: e.target.value } })
              }
              placeholder="e.g. Variant B has a higher conversion rate than variant A"
              className="w-full rounded-xl border border-[#1e293b] bg-[#1e293b] text-white text-sm px-4 py-3 placeholder:text-[#475569] focus:outline-none focus:border-[#1e5d8a] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
              Test Direction
            </label>
            <div className="flex gap-3" role="radiogroup" aria-label="Test direction">
              {(["two-tailed", "one-tailed"] as TestDirection[]).map((dir) => (
                <button
                  key={dir}
                  role="radio"
                  aria-checked={hypothesis.direction === dir}
                  onClick={() =>
                    update({ hypothesis: { ...hypothesis, direction: dir } })
                  }
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    hypothesis.direction === dir
                      ? "bg-[#1e5d8a] border-[#1e5d8a] text-white"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#1e5d8a] hover:text-white"
                  }`}
                >
                  {dir === "two-tailed" ? "Two-tailed (≠)" : "One-tailed (>)"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#475569] mt-2">
              {hypothesis.direction === "two-tailed"
                ? `Tests for any difference in either direction. More conservative: α is split across both tails, so z_α/2 = ${zAlphaFor(parameters.alpha, "two-tailed").toFixed(3)} at your α = ${parameters.alpha.toFixed(2)}`
                : `Tests if treatment is better. Less conservative: all of α sits in one tail, so z_α = ${zAlphaFor(parameters.alpha, "one-tailed").toFixed(3)} at your α = ${parameters.alpha.toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Metric */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Primary Metric</h3>
        <p className="text-[12px] text-[#94a3b8] mb-4">
          Choose the KPI you will measure and set the current baseline rate.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
              Metric Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Metric type">
              {METRICS.map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={metric.name === m}
                  onClick={() => update({ metric: { ...metric, name: m } })}
                  className={`py-2.5 px-3 rounded-xl text-[12px] font-medium border transition-colors text-left ${
                    metric.name === m
                      ? "bg-[#1e293b] border-[#3bb4a4] text-[#3bb4a4]"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#3bb4a4] hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">
                Baseline Rate
              </label>
              <span className="text-sm font-bold text-[var(--color-accent)]">
                {(metric.baselineRate * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Baseline rate percent"
              min={1}
              max={50}
              step={0.5}
              value={metric.baselineRate * 100}
              onChange={(e) =>
                update({
                  metric: {
                    ...metric,
                    baselineRate: parseFloat(e.target.value) / 100,
                  },
                })
              }
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1">
              <span>1%</span>
              <span>50%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Test Parameters</h3>
        <p className="text-[12px] text-[#94a3b8] mb-4">
          Set significance level (α), desired power (1−β), and minimum detectable effect.
        </p>

        <div className="space-y-5">
          {/* Alpha */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">
                Significance Level (α)
              </label>
              <span className="text-sm font-bold text-[var(--color-accent)]">
                {parameters.alpha.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              aria-label="Significance level alpha"
              min={1}
              max={10}
              step={0.5}
              value={parameters.alpha * 100}
              onChange={(e) =>
                update({
                  parameters: {
                    ...parameters,
                    alpha: parseFloat(e.target.value) / 100,
                  },
                })
              }
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1">
              <span>0.01 (strict)</span>
              <span>0.10 (lenient)</span>
            </div>
          </div>

          {/* Power */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">
                Statistical Power (1−β)
              </label>
              <span className="text-sm font-bold text-[var(--color-accent)]">
                {(parameters.power * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Statistical power percent"
              min={70}
              max={99}
              step={1}
              value={parameters.power * 100}
              onChange={(e) =>
                update({
                  parameters: {
                    ...parameters,
                    power: parseFloat(e.target.value) / 100,
                  },
                })
              }
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1">
              <span>70%</span>
              <span>99%</span>
            </div>
          </div>

          {/* MDE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">
                Min. Detectable Effect (MDE)
              </label>
              <span className="text-sm font-bold text-[var(--color-accent)]">
                {(parameters.mde * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Minimum detectable effect percent"
              min={0.5}
              max={5}
              step={0.1}
              value={parameters.mde * 100}
              onChange={(e) =>
                update({
                  parameters: {
                    ...parameters,
                    mde: parseFloat(e.target.value) / 100,
                  },
                })
              }
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1">
              <span>0.5% (small)</span>
              <span>5.0% (large)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sample size result */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Required Sample Size
        </h3>

        {/* Formula display */}
        <div className="rounded-xl bg-[#1e293b] p-4 mb-5 font-mono text-[12px] text-[#94a3b8] space-y-1">
          <p>
            <span className="text-white">n</span> = [z<sub>α</sub>·√(2p̄(1−p̄)) + z<sub>β</sub>·√(p₁(1−p₁) + p₂(1−p₂))]² / MDE²
          </p>
          <p className="text-[#475569]">
            p₁ = {p.toFixed(3)}, p₂ = p₁ + MDE = {p2.toFixed(3)}, p̄ = {pBar.toFixed(3)}
          </p>
          <p className="text-[#475569]">
            = [{zAlpha.toFixed(3)}×{Math.sqrt(2 * pBar * (1 - pBar)).toFixed(4)} + {zPower.toFixed(3)}×{Math.sqrt(p * (1 - p) + p2 * (1 - p2)).toFixed(4)}]² / {(parameters.mde ** 2).toFixed(6)}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[11px] text-[#94a3b8] mb-1">Per group (control &amp; treatment)</p>
          <p className="text-5xl font-black text-[var(--color-accent)] tabular-nums">
            {formulaResult.toLocaleString()}
          </p>
          <p className="text-[12px] text-[#94a3b8] mt-1">
            Total: {(formulaResult * 2).toLocaleString()} participants
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "α", value: parameters.alpha.toFixed(2), color: "#ef4444" },
            { label: "Power", value: `${(parameters.power * 100).toFixed(0)}%`, color: "#3bb4a4" },
            { label: "MDE", value: `${(parameters.mde * 100).toFixed(1)}%`, color: "var(--color-accent)" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl bg-[#1e293b] p-3 text-center"
            >
              <p className="text-[10px] text-[#94a3b8] mb-1">{label}</p>
              <p className="text-sm font-bold" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
            canProceed
              ? "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
              : "bg-[#1e293b] text-[#475569] cursor-not-allowed"
          }`}
        >
          Proceed to Randomization →
        </button>
      </div>
      {!canProceed && (
        <p className="text-[11px] text-[#475569] text-right -mt-3">
          Fill in both H₀ and H₁ to continue
        </p>
      )}
    </motion.div>
  );
}
