"use client";

import { motion } from "framer-motion";
import type { BNStep } from "./types";
import { computeBatchNorm } from "./batchNormLogic";

const SAMPLE_BATCH = [1.2, -0.5, 2.3, 0.1, -1.8];
const BN = computeBatchNorm(SAMPLE_BATCH);

const STEPS: {
  step: BNStep;
  title: string;
  formula: string;
  explanation: string;
  result: string;
}[] = [
  {
    step: 1,
    title: "Compute Batch Mean",
    formula: "μ = (1/m) Σ xᵢ",
    explanation: `μ = (${SAMPLE_BATCH.join(" + ")}) / ${SAMPLE_BATCH.length}`,
    result: `μ = ${BN.mean.toFixed(4)}`,
  },
  {
    step: 2,
    title: "Compute Batch Variance",
    formula: "σ² = (1/m) Σ (xᵢ − μ)²",
    explanation: `Squared deviations from mean ${BN.mean.toFixed(2)}: ${SAMPLE_BATCH.map(
      (x) => `(${x}−${BN.mean.toFixed(2)})²`
    ).join(" + ")}`,
    result: `σ² = ${BN.variance.toFixed(4)}`,
  },
  {
    step: 3,
    title: "Normalize",
    formula: "x̂ᵢ = (xᵢ − μ) / √(σ² + ε)",
    explanation: `ε = 1e-5 for numerical stability. Normalized values:`,
    result: `x̂ = [${BN.normalized.map((v) => v.toFixed(2)).join(", ")}]`,
  },
  {
    step: 4,
    title: "Scale and Shift",
    formula: "yᵢ = γ · x̂ᵢ + β",
    explanation: `γ = ${BN.gamma} (learnable scale), β = ${BN.beta} (learnable shift). With γ=1, β=0: output = normalized.`,
    result: `y = [${BN.output.map((v) => v.toFixed(2)).join(", ")}]`,
  },
];

interface Props {
  currentStep: BNStep;
  onStepChange: (step: BNStep) => void;
  onComplete: () => void;
}

export default function FormulaWalkthrough({ currentStep, onStepChange, onComplete }: Props) {
  function goTo(step: BNStep) {
    onStepChange(step);
    if (step === 4) onComplete();
  }

  function prev() {
    if (currentStep > 1) goTo((currentStep - 1) as BNStep);
  }

  function next() {
    if (currentStep < 4) goTo((currentStep + 1) as BNStep);
    else onComplete();
  }

  return (
    <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-5 sm:p-6">
      {/* Input batch display */}
      <div className="mb-5 p-3 bg-[#0f172a] rounded-xl border border-white/[0.05]">
        <div className="text-[10px] uppercase tracking-wider text-[#475569] mb-1.5">Sample Batch (m = 5)</div>
        <div className="flex gap-2 flex-wrap">
          {SAMPLE_BATCH.map((v, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg text-sm font-mono font-semibold text-white bg-[#1e293b] border border-white/10"
            >
              x{i + 1} = {v}
            </span>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-5">
        {STEPS.map((s) => {
          const isActive = s.step === currentStep;
          const isPast = s.step < currentStep;

          return (
            <motion.div
              key={s.step}
              animate={{
                opacity: isActive ? 1 : isPast ? 0.55 : 0.3,
                scale: isActive ? 1 : 0.99,
              }}
              transition={{ duration: 0.25 }}
              className={`rounded-xl border p-4 transition-colors ${
                isActive
                  ? "border-[#d4af37]/40 bg-[#d4af37]/08"
                  : isPast
                  ? "border-white/[0.06] bg-[#0f172a]/50"
                  : "border-white/[0.04] bg-transparent"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
                    isActive
                      ? "bg-[#d4af37] text-[#0f172a]"
                      : isPast
                      ? "bg-[#3bb4a4]/20 text-[#3bb4a4] border border-[#3bb4a4]/30"
                      : "bg-[#1e293b] text-[#475569] border border-white/[0.06]"
                  }`}
                >
                  {isPast ? "✓" : s.step}
                </div>
                <span
                  className={`text-sm font-semibold ${isActive ? "text-[#d4af37]" : isPast ? "text-[#94a3b8]" : "text-[#475569]"}`}
                >
                  Step {s.step}: {s.title}
                </span>
              </div>

              {(isActive || isPast) && (
                <div className="ml-9 space-y-1.5">
                  <div className="font-mono text-base text-white tracking-wide">
                    {s.formula}
                  </div>
                  <div className="text-xs text-[#94a3b8] leading-relaxed">
                    {s.explanation}
                  </div>
                  <div
                    className="text-xs font-mono font-semibold"
                    style={{ color: isActive ? "#d4af37" : "#3bb4a4" }}
                  >
                    {s.result}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          disabled={currentStep === 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 text-[#94a3b8] hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ◀ Prev
        </button>
        <button
          onClick={next}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0f172a] hover:bg-[#c9a227] transition-colors"
        >
          {currentStep < 4 ? "Next ▶" : "Complete ✓"}
        </button>
        <span className="text-xs text-[#475569] ml-auto">
          Step {currentStep} of 4
        </span>
      </div>
    </div>
  );
}
