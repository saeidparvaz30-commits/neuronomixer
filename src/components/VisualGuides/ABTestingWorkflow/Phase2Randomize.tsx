"use client";

import React from "react";
import { motion } from "framer-motion";
import { Phase2State, RandomizationMethod, SIMULATED_COVARIATES } from "./types";

interface Props {
  state: Phase2State;
  onChange: (state: Phase2State) => void;
  onNext: () => void;
  onBack: () => void;
}

const METHODS: {
  id: RandomizationMethod;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "simple",
    label: "Simple Randomization",
    description:
      "Each participant is assigned to control or treatment with equal probability, like a coin flip. Fast but can lead to imbalanced groups with small samples.",
    icon: "⊙",
  },
  {
    id: "stratified",
    label: "Stratified Randomization",
    description:
      "Participants are divided into strata (e.g. age, gender) before randomization, ensuring each subgroup is balanced across arms. Better for heterogeneous populations.",
    icon: "⊞",
  },
  {
    id: "blocked",
    label: "Block Randomization",
    description:
      "Participants are assigned in fixed blocks (e.g., blocks of 4: AABB, ABAB…) to guarantee balance at every block boundary. Reduces drift over time.",
    icon: "⊟",
  },
];

export default function Phase2Randomize({ state, onChange, onNext, onBack }: Props) {
  function setMethod(m: RandomizationMethod) {
    onChange({ ...state, randomizationMethod: m });
  }

  const total = state.controlSize + state.treatmentSize;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Method selection */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Randomization Method</h3>
        <p className="text-[12px] text-[#94a3b8] mb-4">
          Choose how participants will be assigned to control and treatment groups.
        </p>

        <div className="space-y-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                state.randomizationMethod === m.id
                  ? "border-[#d4af37] bg-[#1e293b]"
                  : "border-[#1e293b] bg-[#0f172a] hover:border-[#1e5d8a]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mt-0.5 ${
                    state.randomizationMethod === m.id
                      ? "bg-[#d4af37]/20 text-[#d4af37]"
                      : "bg-[#1e293b] text-[#94a3b8]"
                  }`}
                >
                  {m.icon}
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold mb-1 ${
                      state.randomizationMethod === m.id
                        ? "text-[#d4af37]"
                        : "text-white"
                    }`}
                  >
                    {m.label}
                  </p>
                  <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                    {m.description}
                  </p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      state.randomizationMethod === m.id
                        ? "border-[#d4af37]"
                        : "border-[#475569]"
                    }`}
                  >
                    {state.randomizationMethod === m.id && (
                      <div className="w-2 h-2 rounded-full bg-[#d4af37]" />
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Group assignment summary */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Group Assignment</h3>
        <p className="text-[12px] text-[#94a3b8] mb-4">
          Based on the sample size calculated in Phase 1, split 50/50 between arms.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl bg-[#1e293b] p-4 text-center border border-[#1e5d8a]/40">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1e5d8a] mb-2">
              Control (A)
            </p>
            <p className="text-3xl font-black text-white tabular-nums">
              {state.controlSize.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#94a3b8] mt-1">participants</p>
          </div>
          <div className="rounded-xl bg-[#1e293b] p-4 text-center border border-[#3bb4a4]/40">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3bb4a4] mb-2">
              Treatment (B)
            </p>
            <p className="text-3xl font-black text-white tabular-nums">
              {state.treatmentSize.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#94a3b8] mt-1">participants</p>
          </div>
        </div>

        {/* Split bar */}
        <div className="rounded-full overflow-hidden h-3 bg-[#1e293b] flex">
          <div
            className="h-full bg-[#1e5d8a] transition-all"
            style={{ width: `${(state.controlSize / total) * 100}%` }}
          />
          <div
            className="h-full bg-[#3bb4a4] transition-all"
            style={{ width: `${(state.treatmentSize / total) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#1e5d8a]">
            {((state.controlSize / total) * 100).toFixed(0)}% Control
          </span>
          <span className="text-[10px] text-[#94a3b8]">Total: {total.toLocaleString()}</span>
          <span className="text-[10px] text-[#3bb4a4]">
            {((state.treatmentSize / total) * 100).toFixed(0)}% Treatment
          </span>
        </div>
      </div>

      {/* Balance checker */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Pre-experiment Balance Check</h3>
        <p className="text-[12px] text-[#94a3b8] mb-4">
          Verify that key covariates are balanced between groups (p &gt; 0.05 = balanced).
          A well-randomized assignment shows no statistically significant differences.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] pb-2 pr-4">
                  Covariate
                </th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-[#1e5d8a] pb-2 px-4">
                  Control
                </th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-[#3bb4a4] pb-2 px-4">
                  Treatment
                </th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] pb-2 px-4">
                  Diff.
                </th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] pb-2 pl-4">
                  p-value
                </th>
              </tr>
            </thead>
            <tbody>
              {SIMULATED_COVARIATES.map((cov) => {
                const diff = cov.treatmentMean - cov.controlMean;
                const balanced = cov.pValue > 0.05;
                return (
                  <tr key={cov.name} className="border-b border-[#1e293b]/50">
                    <td className="py-3 pr-4 text-[13px] text-white font-medium">
                      {cov.name}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] text-[#94a3b8] tabular-nums">
                      {cov.name.includes("%")
                        ? `${(cov.controlMean * 100).toFixed(1)}%`
                        : cov.controlMean.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] text-[#94a3b8] tabular-nums">
                      {cov.name.includes("%")
                        ? `${(cov.treatmentMean * 100).toFixed(1)}%`
                        : cov.treatmentMean.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] text-[#94a3b8] tabular-nums">
                      {diff >= 0 ? "+" : ""}
                      {cov.name.includes("%")
                        ? `${(diff * 100).toFixed(1)}%`
                        : diff.toFixed(1)}
                    </td>
                    <td className="py-3 pl-4 text-right tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          balanced
                            ? "bg-[#3bb4a4]/10 text-[#3bb4a4]"
                            : "bg-[#ef4444]/10 text-[#ef4444]"
                        }`}
                      >
                        {cov.pValue.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#3bb4a4]/20 border border-[#3bb4a4]" />
            <span className="text-[11px] text-[#94a3b8]">p &gt; 0.05 — balanced</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#ef4444]/20 border border-[#ef4444]" />
            <span className="text-[11px] text-[#94a3b8]">p ≤ 0.05 — imbalanced</span>
          </div>
          <div className="ml-auto">
            <span className="text-[11px] font-semibold text-[#3bb4a4]">
              ✓ All covariates balanced
            </span>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-[#1e5d8a]/40 bg-[#1e5d8a]/10 p-4">
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          <span className="font-semibold text-white">Why randomize?</span> Proper randomization
          ensures that on average, any observable and unobservable confounders are equally
          distributed between groups, making the treatment the only systematic difference.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-semibold text-sm border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          ← Back to Design
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-xl font-semibold text-sm bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Start Data Collection →
        </button>
      </div>
    </motion.div>
  );
}
