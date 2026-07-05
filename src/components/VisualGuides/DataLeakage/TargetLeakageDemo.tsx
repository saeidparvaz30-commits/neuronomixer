"use client";

import React from "react";
import type { ChurnDemoResult, LeakState } from "./types";
import { LEAK_NOISE_MIN, LEAK_NOISE_MAX } from "./types";
import PipelineToggle from "./PipelineToggle";
import StatCompare from "./StatCompare";

interface Props {
  result: ChurnDemoResult;
  leak: LeakState;
  onLeakChange: (l: LeakState) => void;
  noise: number;
  onNoiseChange: (v: number) => void;
}

const pct = (a: number) => `${Math.round(a * 100)}%`;

export default function TargetLeakageDemo({ result, leak, onLeakChange, noise, onNoiseChange }: Props) {
  const activeFit = leak === "included" ? result.withLeak : result.baseline;
  const maxW = Math.max(...activeFit.absWeights, 1e-9);
  const majorityRate = Math.max(result.valChurnRate, 1 - result.valChurnRate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <PipelineToggle<LeakState>
              layoutId="target-leak-pill"
              ariaLabel="Leaked feature inclusion"
              active={leak}
              onChange={onLeakChange}
              options={[
                { id: "excluded", label: "Honest features only", color: "var(--color-success)" },
                { id: "included", label: "Add days_until_churn_call", color: "var(--color-warning)" },
              ]}
            />
            <span className="text-[11px] text-[#475569]">
              logistic regression, {result.trainN} train / {result.valN} validation rows
            </span>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Learned weight magnitude per feature (standardized inputs)
          </p>
          <div className="flex flex-col gap-2.5">
            {activeFit.featureNames.map((name, i) => {
              const isLeak = name === "days_until_churn_call";
              const w = activeFit.absWeights[i];
              return (
                <div key={name}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] font-mono text-white flex items-center gap-2">
                      {name}
                      {isLeak && (
                        <span className="text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded-full border border-[#334155] text-[var(--color-warning)]">
                          not available at prediction time
                        </span>
                      )}
                    </span>
                    <span
                      className="text-[12px] font-mono font-bold"
                      style={{ color: isLeak ? "var(--color-warning)" : "#3bb4a4" }}
                    >
                      {w.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(w / maxW) * 100}%`,
                        background: isLeak ? "var(--color-warning)" : "#3bb4a4",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {leak === "included" && (
            <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-4">
              The model piles its weight onto the leaked column and mostly ignores the real
              features. It is not learning churn behavior; it is reading the answer key.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <label htmlFor="dl-leak-noise-slider" className="text-[11px] font-semibold text-[#94a3b8]">
              Leak noise: how corrupted the label copy is
            </label>
            <span className="text-[13px] font-mono font-bold text-white">{noise.toFixed(2)}</span>
          </div>
          <input
            id="dl-leak-noise-slider"
            type="range"
            min={LEAK_NOISE_MIN}
            max={LEAK_NOISE_MAX}
            step={0.05}
            value={noise}
            onChange={(e) => onNoiseChange(parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--color-accent)" }}
          />
          <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
            days_until_churn_call is generated as the label plus this much noise. At zero it is a
            perfect copy of the answer. Even heavily corrupted copies keep inflating the score.
          </p>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-4">
        <StatCompare
          title="Validation accuracy (computed live)"
          items={[
            {
              label: "Honest model: support_tickets + tenure_months",
              display: pct(result.baseline.accuracy),
              fraction: result.baseline.accuracy,
              color: "var(--color-success)",
              highlighted: leak === "excluded",
              note: `Training accuracy ${pct(result.baseline.trainAccuracy)}. Always predicting the majority class would score ${pct(majorityRate)}.`,
            },
            {
              label: "Leaky model: same features + days_until_churn_call",
              display: pct(result.withLeak.accuracy),
              fraction: result.withLeak.accuracy,
              color: "var(--color-warning)",
              highlighted: leak === "included",
              note: `Training accuracy ${pct(result.withLeak.trainAccuracy)}.`,
            },
          ]}
        />

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            Why does the leaky score never survive production? days_until_churn_call is written by
            the retention team after a customer announces they are leaving. When you score a live
            customer, that column does not exist yet. The offline validation number is real math on
            a feature you will never have at prediction time.
          </p>
        </div>
      </div>
    </div>
  );
}
