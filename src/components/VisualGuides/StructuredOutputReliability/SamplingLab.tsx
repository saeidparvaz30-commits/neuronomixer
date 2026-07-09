"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ALL_STRICTNESS,
  BATCH_SIZE,
  OUTCOME_COLORS,
  RunSettings,
  Strictness,
  STRICTNESS_META,
  tokenById,
} from "./types";
import {
  analyticCorrectRate,
  analyticValidRate,
  analyticValidWrongRate,
  BatchResult,
  GenerationTrace,
} from "./simulation";
import { formatPct } from "./economics";

type Props = {
  errorRatePct: number;
  strictness: Strictness;
  constrained: boolean;
  onErrorRateChange: (pct: number) => void;
  onStrictnessChange: (s: Strictness) => void;
  onConstrainedChange: (c: boolean) => void;
  trace: GenerationTrace | null;
  traceSettings: RunSettings | null;
  batch: BatchResult | null;
  batchSettings: RunSettings | null;
  onSampleTrace: () => void;
  onRunBatch: () => void;
};

const DECODING_OPTIONS = [
  { constrained: false, label: "Unconstrained" },
  { constrained: true, label: "Constrained (grammar mask)" },
] as const;

export default function SamplingLab({
  errorRatePct,
  strictness,
  constrained,
  onErrorRateChange,
  onStrictnessChange,
  onConstrainedChange,
  trace,
  traceSettings,
  batch,
  batchSettings,
  onSampleTrace,
  onRunBatch,
}: Props) {
  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Set a per-token error rate, pick a schema strictness, and sample. Unconstrained,
        the generator emits whatever it draws. Constrained, every draw is checked against
        the grammar: illegal tokens are masked and the generator redraws, which is
        renormalization by rejection sampling. All samples come from a seeded PRNG, so
        the same settings always reproduce the same numbers.
      </p>

      {/* Controls */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="sor-error-rate"
            className="text-[12px] font-semibold text-white"
          >
            Per-token error rate
          </label>
          <input
            id="sor-error-rate"
            type="range"
            min={0}
            max={50}
            step={1}
            value={errorRatePct}
            onChange={(e) => onErrorRateChange(Number(e.target.value))}
            className="w-48 accent-[#d4af37]"
          />
          <span className="text-[13px] font-mono font-bold text-[var(--color-accent)] w-10">
            {errorRatePct}%
          </span>
          <span className="text-[11px] text-[#475569]">
            chance each token drifts to a random vocabulary token
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-semibold text-white">Schema strictness</span>
          <div
            className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
            role="radiogroup"
            aria-label="Schema strictness"
          >
            {ALL_STRICTNESS.map((s) => {
              const isActive = strictness === s;
              return (
                <button
                  key={s}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onStrictnessChange(s)}
                  className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sor-strictness-pill"
                      className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{STRICTNESS_META[s].label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-semibold text-white">Decoding</span>
          <div
            className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
            role="radiogroup"
            aria-label="Decoding mode"
          >
            {DECODING_OPTIONS.map((opt) => {
              const isActive = constrained === opt.constrained;
              return (
                <button
                  key={opt.label}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onConstrainedChange(opt.constrained)}
                  className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sor-decoding-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: opt.constrained
                          ? "var(--color-success)"
                          : "var(--color-warning)",
                      }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onSampleTrace}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#334155] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            Sample one generation
          </button>
          <button
            onClick={onRunBatch}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Run {BATCH_SIZE} generations
          </button>
        </div>
      </div>

      {/* Single-generation trace */}
      {trace && traceSettings && (
        <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide">
              One sampled generation
            </p>
            <p className="text-[11px] text-[#475569] font-mono">
              {traceSettings.errorRatePct}% error, {STRICTNESS_META[traceSettings.strictness].label},{" "}
              {traceSettings.constrained ? "constrained" : "unconstrained"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {trace.steps.map((step) => {
              const wrongValue = step.legal && step.emittedId !== step.intendedId;
              return (
                <span key={step.pos} className="inline-flex items-center gap-1">
                  {step.maskedIds.map((id, i) => (
                    <span
                      key={`${step.pos}-m${i}`}
                      className="px-1.5 py-0.5 rounded font-mono text-[11px] border border-dashed line-through"
                      style={{ borderColor: OUTCOME_COLORS.invalid, color: OUTCOME_COLORS.invalid }}
                      title="Masked by the grammar, redrawn"
                    >
                      ✗ {tokenById(id).text}
                    </span>
                  ))}
                  <span
                    className="px-1.5 py-0.5 rounded font-mono text-[11px] border"
                    style={
                      !step.legal
                        ? { borderColor: OUTCOME_COLORS.invalid, color: OUTCOME_COLORS.invalid }
                        : wrongValue
                          ? { borderColor: OUTCOME_COLORS.validWrong, color: OUTCOME_COLORS.validWrong }
                          : { borderColor: "#334155", color: "#93c5fd" }
                    }
                    title={
                      !step.legal
                        ? "Grammar-illegal token: the JSON no longer parses"
                        : wrongValue
                          ? "Legal token, but not the intended value"
                          : "Intended token"
                    }
                  >
                    {!step.legal ? "✗ " : wrongValue ? "≠ " : ""}
                    {tokenById(step.emittedId).text}
                  </span>
                </span>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
            <span className="text-[10px] text-[#475569]">
              <span className="font-mono text-[#93c5fd]">plain</span> intended
            </span>
            <span className="text-[10px]" style={{ color: OUTCOME_COLORS.validWrong }}>
              ≠ legal but wrong value
            </span>
            <span className="text-[10px]" style={{ color: OUTCOME_COLORS.invalid }}>
              ✗ illegal (struck-through = masked and redrawn)
            </span>
          </div>
          <p className="text-[12px] leading-relaxed">
            {trace.outcome === "invalid" && trace.firstIllegalPos !== null && (
              <span style={{ color: OUTCOME_COLORS.invalid }}>
                Parse breaks at token {trace.firstIllegalPos + 1}: this output is thrown
                away and the call must be retried.
              </span>
            )}
            {trace.outcome === "valid-wrong" && (
              <span style={{ color: OUTCOME_COLORS.validWrong }}>
                Valid JSON, wrong content: this one sails through every parser and
                schema check. No retry loop will ever catch it.
              </span>
            )}
            {trace.outcome === "valid-correct" && (
              <span className="text-[var(--color-success)]">
                Valid and exactly the intended call.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Batch results */}
      {batch && batchSettings && (
        <BatchPanel batch={batch} settings={batchSettings} />
      )}
    </div>
  );
}

function BatchPanel({ batch, settings }: { batch: BatchResult; settings: RunSettings }) {
  const e = settings.errorRatePct / 100;
  const aValid = analyticValidRate(e, settings.strictness, settings.constrained);
  const aCorrect = analyticCorrectRate(e, settings.strictness, settings.constrained);
  const aWrong = analyticValidWrongRate(e, settings.strictness, settings.constrained);

  const segments = [
    {
      key: "valid-correct",
      label: "Valid and intended",
      count: batch.validCorrect,
      analytic: aCorrect,
      color: OUTCOME_COLORS.validCorrect,
    },
    {
      key: "valid-wrong",
      label: "Valid but wrong value",
      count: batch.validWrong,
      analytic: aWrong,
      color: OUTCOME_COLORS.validWrong,
    },
    {
      key: "invalid",
      label: "Invalid (parse fails)",
      count: batch.invalid,
      analytic: 1 - aValid,
      color: OUTCOME_COLORS.invalid,
    },
  ];

  return (
    <div className="rounded-xl border border-[#1e293b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide">
          {batch.n} sampled generations
        </p>
        <p className="text-[11px] text-[#475569] font-mono">
          {settings.errorRatePct}% error, {STRICTNESS_META[settings.strictness].label},{" "}
          {settings.constrained ? "constrained" : "unconstrained"}
        </p>
      </div>

      {/* Stacked outcome bar */}
      <div
        className="flex h-4 rounded-full overflow-hidden border border-[#1e293b] mb-4"
        role="img"
        aria-label={`Out of ${batch.n} generations: ${batch.validCorrect} valid and intended, ${batch.validWrong} valid but wrong value, ${batch.invalid} invalid`}
      >
        {segments.map(
          (s) =>
            s.count > 0 && (
              <div
                key={s.key}
                style={{ width: `${(s.count / batch.n) * 100}%`, background: s.color }}
              />
            )
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {segments.map((s) => (
          <div key={s.key} className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#475569] mb-1 flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </p>
            <p className="text-[16px] font-mono font-bold" style={{ color: s.color }}>
              {s.count}{" "}
              <span className="text-[12px]">({formatPct(s.count / batch.n)})</span>
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              analytic: {formatPct(s.analytic, 2)}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#475569] leading-relaxed">
        Empirical rates come from actually running the {batch.n} seeded generations;
        analytic rates come from the exact per-step legality product. They agree up to
        sampling noise. Valid rate: {formatPct(batch.validRate)} empirical vs{" "}
        {formatPct(aValid, 2)} analytic.
      </p>
    </div>
  );
}
